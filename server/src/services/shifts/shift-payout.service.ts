import { randomUUID } from 'node:crypto';
import { logger } from '../../config/logger';
import { config } from '../../config/env';
import { stripe } from '../../config/stripe';
import { supabase } from '../../config/supabase';
import { SHIFT_STATUS_COMPLETED } from './shift.constants';
import { enqueueShiftPayoutReceivedEmail } from './shift-payout-email.service';

type ShiftPayoutRow = {
  id: string;
  request_id: string;
  status: string | null;
  worker_id: string;
  hourly_rate: number | null;
  checkin_time: string | null;
  checkout_time: string | null;
  start_time: string | null;
  end_time: string | null;
};

function normStatus(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * After a shift is marked {@link SHIFT_STATUS_COMPLETED}, moves funds to the worker’s
 * Connect payroll account and records a `transfers` row. Idempotent per `shift_id`.
 * Billable hours use scheduled `start_time` / `end_time`, not check-in/out.
 */
export async function processShiftPayoutJob(shiftId: string): Promise<void> {
  const { data: shift, error: shiftErr } = await supabase
    .from('shifts')
    .select('id, request_id, status, worker_id, hourly_rate, start_time, end_time')
    .eq('id', shiftId)
    .maybeSingle();

  if (shiftErr) {
    logger.error({ shiftId, err: shiftErr }, 'shift.payout: load shift failed');
    throw new Error(shiftErr.message);
  }
  const row = shift as ShiftPayoutRow | null;
  if (!row) {
    logger.warn({ shiftId }, 'shift.payout: shift not found');
    return;
  }
  if (normStatus(row.status) !== SHIFT_STATUS_COMPLETED) {
    logger.info({ shiftId, status: row.status }, 'shift.payout: shift not completed, skipping');
    return;
  }

  const { data: existing, error: exErr } = await supabase
    .from('transfers')
    .select('id')
    .eq('shift_id', shiftId)
    .maybeSingle();

  if (exErr) {
    logger.error({ shiftId, err: exErr }, 'shift.payout: transfers lookup failed');
    throw new Error(exErr.message);
  }
  if (existing) {
    logger.info({ shiftId }, 'shift.payout: transfer already recorded, skipping');
    return;
  }

  if (!row.start_time || !row.end_time) {
    logger.warn({ shiftId }, 'shift.payout: missing scheduled start/end times');
    return;
  }

  const startMs = new Date(row.start_time).getTime();
  const endMs = new Date(row.end_time).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    logger.warn({ shiftId }, 'shift.payout: invalid scheduled time range');
    return;
  }

  const hours = (endMs - startMs) / (1000 * 60 * 60);
  const hourly = row.hourly_rate ?? 0;
  if (hours <= 0 || hourly <= 0) {
    logger.warn({ shiftId, hours, hourly }, 'shift.payout: zero hours or rate');
    return;
  }

  const amountCents = Math.max(1, Math.round(hours * hourly * 100));
  const currency = config.stripe.currency.toLowerCase();

  const { data: worker, error: wErr } = await supabase
    .from('workers')
    .select('user_id, first_name')
    .eq('id', row.worker_id)
    .maybeSingle();

  if (wErr || !worker?.user_id) {
    logger.error({ shiftId, err: wErr }, 'shift.payout: worker user not found');
    return;
  }

  const { data: payroll, error: pErr } = await supabase
    .from('payroll_accounts')
    .select('stripe_account_id, payouts_enabled')
    .eq('user_id', worker.user_id)
    .maybeSingle();

  if (pErr || !payroll?.stripe_account_id) {
    logger.error({ shiftId, err: pErr }, 'shift.payout: no payroll Connect account');
    return;
  }

  logger.info({ shiftId, amountCents, currency, payroll }, 'shift.payout: creating Stripe transfer');

  let stripeTransferId: string;
  try {
    const transfer = await stripe.transfers.create(
      {
        amount:      amountCents,
        currency,
        destination: payroll.stripe_account_id,
        transfer_group: row.request_id,
        metadata:    { shift_id: shiftId, worker_id: row.worker_id },
      },
      // { idempotencyKey: `shift-payout-transfer-${shiftId}` },
    );
    stripeTransferId = transfer.id;
  } catch (err) {
    logger.error({ shiftId, err }, 'shift.payout: Stripe transfer failed');
    throw err instanceof Error ? err : new Error('Stripe transfer failed');
  }

  const transferRowId = randomUUID();
  const { error: insErr } = await supabase.from('transfers').insert({
    id:                 transferRowId,
    shift_id:           shiftId,
    amount_cents:       amountCents,
    currency:           currency.toUpperCase(),
    stripe_transfer_id: stripeTransferId,
    status:             'succeeded',
  });

  if (insErr) {
    logger.error(
      { shiftId, stripeTransferId, err: insErr },
      'shift.payout: DB insert failed after Stripe transfer — reconcile manually',
    );
    throw new Error(insErr.message);
  }

  logger.info(
    { shiftId, amountCents, stripeTransferId, payoutsEnabled: payroll.payouts_enabled },
    'shift.payout: transfer created',
  );

  await enqueueShiftPayoutReceivedEmail({
    shiftId,
    workerUserId:     worker.user_id,
    workerFirstName:  (worker.first_name ?? '').trim(),
    amountCents,
    currency:         currency.toUpperCase(),
    billableHours:    hours,
    stripeTransferId,
  });
}
