import { logger, task } from "@trigger.dev/sdk/v3";
import type Stripe from "stripe";
import {
    stripeWebhookJobSchema,
    type StripeWebhookJobPayload,
} from "@/services/stripe/stripe-webhook/schemas";
import { handleSubscriptionDeleted } from "@/services/stripe/stripe-webhook/handlers/subscription-deleted";

export const stripeSubscriptionDeletedTask = task({
    id: "stripe.subscription.deleted",
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
        logger.log("Processing customer.subscription.deleted", {
            eventId: payload.eventId,
        });

        const subscription = payload.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);

        return { eventId: payload.eventId, ok: true };
    },
});
