import "server-only";

import type Stripe from "stripe";
import { updateInvoiceStatusByStripeId } from "@/features/billing/dal/mutations";

/**
 * Marks the invoice as "payment_failed" when Stripe can't collect payment.
 *
 * Triggered by `invoice.payment_failed`. Stripe may retry automatically
 * depending on the customer's Smart Retries settings. We persist the status
 * so the admin dashboard can surface overdue invoices for manual follow-up.
 *
 * TODO: send an admin / client notification when this fires.
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  await updateInvoiceStatusByStripeId(invoice.id, "payment_failed");
}
