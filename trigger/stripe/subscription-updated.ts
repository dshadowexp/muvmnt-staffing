import { logger, task } from "@trigger.dev/sdk/v3";
import type Stripe from "stripe";
import {
    stripeWebhookJobSchema,
    type StripeWebhookJobPayload,
} from "@/services/stripe/stripe-webhook/schemas";
import { handleSubscriptionUpdated } from "@/services/stripe/stripe-webhook/handlers/subscription-updated";

export const stripeSubscriptionUpdatedTask = task({
    id: "stripe.subscription.updated",
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
        logger.log("Processing customer.subscription.updated", {
            eventId: payload.eventId,
        });

        const subscription = payload.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);

        return { eventId: payload.eventId, ok: true };
    },
});
