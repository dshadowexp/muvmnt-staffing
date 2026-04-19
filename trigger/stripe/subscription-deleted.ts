import { logger, task } from "@trigger.dev/sdk/v3";
import type Stripe from "stripe";
import {
    stripeWebhookJobSchema,
    type StripeWebhookJobPayload,
} from "@/features/payments/billing/stripe-webhook/schemas";
import { handleSubscriptionDeleted } from "@/features/payments/billing/stripe-webhook/handlers/subscription-deleted";

export const stripeSubscriptionDeletedTask = task({
    id: "stripe.customer.subscription.deleted",
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
        logger.log("Processing Stripe customer.subscription.deleted", {
            eventId: payload.eventId,
        });

        const subscription = payload.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);

        return { eventId: payload.eventId, ok: true };
    },
});
