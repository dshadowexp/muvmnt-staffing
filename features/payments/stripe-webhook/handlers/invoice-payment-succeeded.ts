import "server-only";

import type Stripe from "stripe";
import { updateInvoiceStatusByStripeId } from "@/features/billing/dal/mutations";

/**
 * Marks the corresponding invoice row as "paid" when Stripe confirms payment.
 *
 * Triggered by the `invoice.payment_succeeded` webhook event. At this point the
 * invoice is fully settled — no further action needed for `charge_automatically`
 * clients. For `send_invoice` clients this fires when they pay the emailed invoice.
 */
export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  await updateInvoiceStatusByStripeId(invoice.id, "paid");
}
