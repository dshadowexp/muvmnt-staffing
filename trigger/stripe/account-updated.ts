import { logger, task } from "@trigger.dev/sdk/v3";
import type Stripe from "stripe";
import {
    stripeWebhookJobSchema,
    type StripeWebhookJobPayload,
} from "@/features/payments/stripe-webhook/schemas";
import { handleAccountUpdated } from "@/features/payments/stripe-webhook/handlers/account-updated";

/**
 * Background worker for Stripe `account.updated`.
 *
 * Separate tasks per event type let us tune retries / concurrency / machine
 * size independently and surface clean per-event metrics in Trigger.dev.
 */
export const stripeAccountUpdatedTask = task({
    id: "stripe.account.updated",
    maxDuration: 120,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 2_000,
        maxTimeoutInMs: 60_000,
        factor: 2,
        randomize: true,
    },
    run: async (rawPayload: StripeWebhookJobPayload) => {
        const payload = stripeWebhookJobSchema.parse(rawPayload);
        logger.log("Processing Stripe account.updated", {
            eventId: payload.eventId,
            livemode: payload.livemode,
        });

        const account = payload.data.object as Stripe.Account;
        await handleAccountUpdated(account);

        return { eventId: payload.eventId, ok: true };
    },
});
