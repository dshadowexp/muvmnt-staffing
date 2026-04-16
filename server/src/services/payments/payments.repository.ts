import { supabase } from '../../config/supabase';
import type { StaffRequestPaymentMethodCardSnapshot } from './staff-request-payment-method-snapshot';

export async function insertStaffRequestPayment(row: {
  requestId: string;
  stripePaymentIntentId: string;
  paymentMethod: StaffRequestPaymentMethodCardSnapshot;
  amountCents: number;
  currency: string;
  status: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from('payments').insert({
    request_id:        row.requestId,
    stripe_payment_id: row.stripePaymentIntentId,
    payment_method:    row.paymentMethod,
    amount_cents:      row.amountCents,
    currency:          row.currency,
    status:            row.status,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
