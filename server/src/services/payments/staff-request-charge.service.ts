import Stripe from 'stripe';
import { stripe } from '../../config/stripe';
import { insertStaffRequestPayment } from './payments.repository';
import { cardSnapshotFromStripePaymentMethod } from './staff-request-payment-method-snapshot';

export type StaffRequestChargeResult =
  | { ok: true; paymentIntentId: string; amountCents: number }
  | { ok: false; message: string; code?: string };

function stripeErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return undefined;
}

/** Maps Stripe errors to short, user-safe messages (see https://stripe.com/docs/error-codes). */
function mapStripeChargeError(err: unknown): { message: string; code?: string } {
  const code = stripeErrorCode(err);

  if (err instanceof Stripe.errors.StripeCardError) {
    const decline = 'decline_code' in err && typeof err.decline_code === 'string' ? err.decline_code : undefined;
    switch (err.code) {
      case 'card_declined':
        return {
          message:
            decline === 'insufficient_funds'
              ? 'Your card has insufficient funds.'
              : 'Your card was declined. Try another payment method.',
          code: decline ?? err.code,
        };
      case 'expired_card':
        return { message: 'Your card has expired.', code: err.code };
      case 'incorrect_cvc':
      case 'incorrect_number':
        return { message: 'Your card details could not be verified.', code: err.code };
      case 'processing_error':
        return { message: 'A processing error occurred; try again.', code: err.code };
      case 'authentication_required':
        return {
          message: 'This card requires authentication. Add the card again while you are signed in.',
          code: err.code,
        };
      default:
        return { message: err.message ?? 'Card payment failed.', code: err.code };
    }
  }

  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    if (err.code === 'amount_too_small') {
      return { message: 'The charge amount is too small to process.', code: err.code };
    }
    return { message: err.message ?? 'Invalid payment request.', code: err.code };
  }

  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    return { message: 'Payment service configuration error.', code: 'stripe_auth' };
  }
  if (err instanceof Stripe.errors.StripeAPIError) {
    return { message: 'Payment service is temporarily unavailable. Try again shortly.', code: 'stripe_api' };
  }
  if (err instanceof Stripe.errors.StripeConnectionError) {
    return { message: 'Could not reach the payment service.', code: 'stripe_connection' };
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return { message: 'Too many payment attempts; wait a moment and try again.', code: 'rate_limit' };
  }

  if (err instanceof Stripe.errors.StripeError) {
    return { message: err.message ?? 'Payment failed.', code: err.code };
  }

  return { message: 'Payment failed.', code };
}

/**
 * Off-session PaymentIntent for a confirmed staff request quote (server-only).
 * Persists a `payments` row on success. Uses idempotency so confirm retries do not double-charge.
 */
export async function chargeStaffRequestOffSession(params: {
  jobId: string;
  clientUserId: string;
  stripeCustomerId: string;
  paymentMethodId: string;
  amountCents: number;
}): Promise<StaffRequestChargeResult> {
  if (!Number.isFinite(params.amountCents) || params.amountCents < 50) {
    return { ok: false, message: 'Invalid or too small amount to charge.', code: 'invalid_amount' };
  }

  try {
    // Customer-scoped retrieve (snapshot survives if the PM is later detached from the customer).
    // https://docs.stripe.com/api/payment_methods/customer
    let retrievedPm: Stripe.PaymentMethod;
    try {
      retrievedPm = await stripe.customers.retrievePaymentMethod(
        params.stripeCustomerId,
        params.paymentMethodId,
      );
    } catch (err) {
      const msg =
        err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing'
          ? 'This payment method is no longer available. Add a card and try again.'
          : 'Could not load the selected payment method.';
      return { ok: false, message: msg, code: 'payment_method_unavailable' };
    }

    const paymentMethodSnapshot = cardSnapshotFromStripePaymentMethod(retrievedPm);
    if (paymentMethodSnapshot == null) {
      return {
        ok:      false,
        message: 'Only card payment methods can be used for this charge.',
        code:    'unsupported_payment_method',
      };
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount:                   params.amountCents,
        currency:                 'cad',
        customer:                 params.stripeCustomerId,
        payment_method:           params.paymentMethodId,
        confirm:                  true,
        off_session:              true,
        // error_on_requires_action: true,
        transfer_group:           params.jobId,
        metadata: {
          staff_request_id: params.jobId,
          client_id:        params.clientUserId,
        },
      },
      { idempotencyKey: `staff-request-confirm-${params.jobId}` },
    );

    if (intent.status !== 'succeeded') {
      return {
        ok:      false,
        message: 'Payment did not complete.',
        code:    intent.status,
      };
    }

    const saved = await insertStaffRequestPayment({
      requestId:             params.jobId,
      stripePaymentIntentId: intent.id,
      paymentMethod:         paymentMethodSnapshot,
      amountCents:           params.amountCents,
      currency:              'cad',
      status:                'succeeded',
    });

    if (!saved.ok) {
      return { ok: false, message: saved.message, code: 'payment_row_failed' };
    }

    return { ok: true, paymentIntentId: intent.id, amountCents: params.amountCents };
  } catch (err) {
    const { message, code } = mapStripeChargeError(err);
    return { ok: false, message, code };
  }
}
