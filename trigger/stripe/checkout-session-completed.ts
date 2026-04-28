import { logger, task } from "@trigger.dev/sdk/v3";
import type Stripe from "stripe";
import {
    stripeWebhookJobSchema,
    type StripeWebhookJobPayload,
} from "@/services/stripe/stripe-webhook/schemas";
import { handleCheckoutSessionCompleted } from "@/services/stripe/stripe-webhook/handlers/checkout-session-completed";

export const stripeCheckoutSessionCompletedTask = task({
    id: "stripe.checkout.session.completed",
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
        logger.log("Processing Stripe checkout.session.completed", {
            eventId: payload.eventId,
        });

        const session = payload.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);

        return { eventId: payload.eventId, ok: true };
    },
});
