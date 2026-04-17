import Stripe from 'stripe';
import { logger } from '../../config/logger';
import { stripe } from '../../config/stripe';
import { supabase } from '../../config/supabase';
import { cardSnapshotFromStripePaymentMethod } from '../payments/staff-request-payment-method-snapshot';
import { SHIFT_STATUS_COMPLETED } from './shift.constants';

type ShiftReviewContext = {
  ok:           true;
  shiftId:      string;
  workerId:     string;
  workerUserId: string;
  clientUserId: string;
};

type LoadFailure = { ok: false; code?: string; message: string };

export type ShiftReviewSuccess = { ok: true };
export type ShiftReviewFailure = { ok: false; code?: string; message: string };
export type ShiftReviewActionResult<T = unknown> =
  | (ShiftReviewSuccess & T)
  | ShiftReviewFailure;

function normStatus(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Resolve and authorise a completed shift for the client owner. Ensures the shift exists,
 * belongs to the caller's staff-request, and is in `completed` state before allowing
 * rating or tip flows.
 */
async function loadCompletedShiftForClient(
  clientUserId: string,
  shiftId: string,
): Promise<ShiftReviewContext | LoadFailure> {
  const { data, error } = await supabase
    .from('shifts')
    .select(
      `
      id,
      status,
      worker_id,
      staff_requests!inner ( client_id ),
      workers!inner ( user_id )
      `,
    )
    .eq('id', shiftId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { ok: false, message: error.message };
  }
  if (!data) return { ok: false, message: 'Shift not found' };

  const row = data as unknown as {
    id:         string;
    status:     string | null;
    worker_id:  string;
    staff_requests: { client_id: string } | null;
    workers:        { user_id: string } | null;
  };

  if (!row.staff_requests || row.staff_requests.client_id !== clientUserId) {
    return { ok: false, message: 'Shift not found' };
  }
  if (normStatus(row.status) !== SHIFT_STATUS_COMPLETED) {
    return { ok: false, code: 'not_completed', message: 'Only completed shifts can be reviewed' };
  }
  if (!row.workers?.user_id) {
    return { ok: false, message: 'Worker account not found' };
  }

  return {
    ok:            true,
    shiftId,
    workerId:      row.worker_id,
    workerUserId:  row.workers.user_id,
    clientUserId,
  };
}

/** Upsert the caller's rating for a completed shift (one rating per client per shift). */
export async function rateClientShift(
  clientUserId: string,
  shiftId: string,
  input: { rating: number; comment?: string },
): Promise<ShiftReviewActionResult> {
  const ctx = await loadCompletedShiftForClient(clientUserId, shiftId);
  if (!ctx.ok) return ctx;

  const { error } = await supabase
    .from('shift_ratings')
    .upsert(
      {
        shift_id:        ctx.shiftId,
        client_user_id:  clientUserId,
        worker_id:       ctx.workerId,
        rating:          input.rating,
        comment:         input.comment?.length ? input.comment : null,
      },
      { onConflict: 'shift_id,client_user_id' },
    );

  if (error) {
    logger.error({ shiftId, err: error }, 'shift.rate: upsert failed');
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Charge the client's saved card and route funds straight to the worker's Connect account
 * using `transfer_data.destination`. Platform keeps no fee — worker gets the full tip.
 * Idempotent per `(shift,client)` via Stripe idempotency key + DB unique constraint.
 */
export async function tipClientShift(
  clientUserId: string,
  shiftId: string,
  input: { amountCents: number },
): Promise<ShiftReviewActionResult<{ paymentIntentId: string; amountCents: number; currency: string }>> {
  const ctx = await loadCompletedShiftForClient(clientUserId, shiftId);
  if (!ctx.ok) return ctx;

  // Block duplicate tips (keeps UX honest even if client retries).
  const { data: existing, error: exErr } = await supabase
    .from('shift_tips')
    .select('id')
    .eq('shift_id', ctx.shiftId)
    .eq('client_user_id', clientUserId)
    .maybeSingle();
  if (exErr && exErr.code !== 'PGRST116') {
    return { ok: false, message: exErr.message };
  }
  if (existing) {
    return { ok: false, code: 'already_tipped', message: 'You have already tipped this shift' };
  }

  const { data: billing, error: billingErr } = await supabase
    .from('billing_accounts')
    .select('stripe_customer_id, default_payment_method_id')
    .eq('user_id', clientUserId)
    .maybeSingle();

  if (billingErr) return { ok: false, message: billingErr.message };
  if (!billing?.stripe_customer_id) return { ok: false, message: 'No billing account on file' };
  if (!billing.default_payment_method_id) {
    return { ok: false, code: 'no_payment_method', message: 'No saved payment method — add a card first' };
  }

  const { data: payroll, error: prErr } = await supabase
    .from('payroll_accounts')
    .select('stripe_account_id, charges_enabled')
    .eq('user_id', ctx.workerUserId)
    .maybeSingle();

  if (prErr) return { ok: false, message: prErr.message };
  if (!payroll?.stripe_account_id) {
    return { ok: false, code: 'worker_not_payable', message: 'Worker cannot receive payouts yet' };
  }
  if (payroll.charges_enabled === false) {
    return { ok: false, code: 'worker_not_payable', message: 'Worker’s payout account is not active' };
  }

  // Snapshot the card in case it is detached later.
  let pm: Stripe.PaymentMethod;
  try {
    pm = await stripe.customers.retrievePaymentMethod(
      billing.stripe_customer_id,
      billing.default_payment_method_id,
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing') {
      return { ok: false, code: 'no_payment_method', message: 'Saved card is no longer available' };
    }
    return { ok: false, message: 'Could not load saved payment method' };
  }
  const snapshot = cardSnapshotFromStripePaymentMethod(pm);
  if (!snapshot) {
    return { ok: false, code: 'unsupported_payment_method', message: 'Only card payment methods can be used for tips' };
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount:         input.amountCents,
        currency:       'cad',
        customer:       billing.stripe_customer_id,
        payment_method: billing.default_payment_method_id,
        confirm:        true,
        off_session:    true,
        // Routes funds directly to the worker's connected account; platform takes no fee.
        transfer_data: { destination: payroll.stripe_account_id },
        metadata: {
          kind:             'shift_tip',
          shift_id:         ctx.shiftId,
          worker_id:        ctx.workerId,
          worker_user_id:   ctx.workerUserId,
          client_user_id:   clientUserId,
        },
      },
      { idempotencyKey: `shift-tip-${ctx.shiftId}-${clientUserId}` },
    );
  } catch (err) {
    logger.error({ shiftId, err }, 'shift.tip: stripe charge failed');
    if (err instanceof Stripe.errors.StripeCardError) {
      return { ok: false, code: err.code, message: err.message ?? 'Card was declined' };
    }
    if (err instanceof Stripe.errors.StripeError) {
      return { ok: false, code: err.code, message: err.message ?? 'Payment failed' };
    }
    return { ok: false, message: 'Payment failed' };
  }

  if (intent.status !== 'succeeded') {
    return { ok: false, code: intent.status, message: 'Tip did not complete' };
  }

  const currency = (intent.currency ?? 'cad').toUpperCase();
  const { error: insErr } = await supabase.from('shift_tips').insert({
    shift_id:                       ctx.shiftId,
    client_user_id:                 clientUserId,
    worker_id:                      ctx.workerId,
    amount_cents:                   input.amountCents,
    currency,
    stripe_payment_intent_id:       intent.id,
    stripe_destination_account_id:  payroll.stripe_account_id,
    status:                         'succeeded',
  });

  if (insErr) {
    logger.error(
      { shiftId, paymentIntentId: intent.id, err: insErr },
      'shift.tip: DB insert failed after Stripe charge — reconcile manually',
    );
    return { ok: false, message: insErr.message };
  }

  return {
    ok:               true,
    paymentIntentId:  intent.id,
    amountCents:      input.amountCents,
    currency,
  };
}
