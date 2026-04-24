import { logger, task } from "@trigger.dev/sdk/v3";
import { type StripeWebhookJobPayload, stripeWebhookJobSchema } from "@/features/payments/stripe-webhook/schemas";

export const stripeIdentityVerificationSessionVerifiedTask = task({
    id: "stripe.identity.verification_session.verified",
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
        logger.log("Processing Stripe identity verification session", {
            eventId: payload.eventId,
        });
    },
});

export const stripeIdentityVerificationSessionRequiresInputTask = task({
    id: "stripe.identity.verification_session.requires_input",
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
        logger.log("Processing Stripe identity verification session requires input", {
            eventId: payload.eventId,
        });
    },
})