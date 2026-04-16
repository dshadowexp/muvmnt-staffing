import type Stripe from 'stripe';

/** Minimal card fields stored on `payments.payment_method` (jsonb) after a successful charge. */
export type StaffRequestPaymentMethodCardSnapshot = {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
};

export function cardSnapshotFromStripePaymentMethod(
  pm: Stripe.PaymentMethod,
): StaffRequestPaymentMethodCardSnapshot | null {
  if (pm.type !== 'card' || pm.card == null) return null;
  return {
    brand:     pm.card.brand,
    last4:     pm.card.last4,
    exp_month: pm.card.exp_month,
    exp_year:  pm.card.exp_year,
  };
}
