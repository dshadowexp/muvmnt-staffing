import { supabase } from '../../config/supabase';

export async function insertStaffRequestPayment(row: {
  requestId: string;
  stripePaymentIntentId: string;
  amountCents: number;
  currency: string;
  status: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from('payments').insert({
    request_id:          row.requestId,
    stripe_payment_id:   row.stripePaymentIntentId,
    amount_cents:        row.amountCents,
    currency:            row.currency,
    status:              row.status,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
