import { logger, task } from "@trigger.dev/sdk/v3";
import type Stripe from "stripe";

import {
  stripeWebhookJobSchema,
  type StripeWebhookJobPayload,
} from "@/features/payments/stripe-webhook/schemas";
import { handleInvoicePaymentFailed } from "@/features/payments/stripe-webhook/handlers/invoice-payment-failed";

export const stripeInvoicePaymentFailedTask = task({
  id: "stripe.invoice.payment_failed",
  maxDuration: 60,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
    factor: 2,
    randomize: true,
  },
  run: async (rawPayload: StripeWebhookJobPayload) => {
    const payload = stripeWebhookJobSchema.parse(rawPayload);
    logger.log("Processing Stripe invoice.payment_failed", {
      eventId: payload.eventId,
      livemode: payload.livemode,
    });

    const invoice = payload.data.object as Stripe.Invoice;
    await handleInvoicePaymentFailed(invoice);

    return { eventId: payload.eventId, invoiceId: invoice.id, ok: true };
  },
});
