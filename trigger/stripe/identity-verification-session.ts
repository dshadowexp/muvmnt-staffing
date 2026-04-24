import { logger, task } from "@trigger.dev/sdk/v3";
import { type StripeWebhookJobPayload, stripeWebhookJobSchema } from "@/features/payments/stripe-webhook/schemas";
import { handleIdentityVerificationSessionVerified } from "@/features/payments/stripe-webhook/handlers/identity-verification_session-verified";
import { handleIdentityVerificationSessionRequiresInput } from "@/features/payments/stripe-webhook/handlers/identity-verification_session-requires_input";
import type Stripe from "stripe";

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

        logger.log("Processing identity.verification_session.verified", {
            eventId: payload.eventId,
        });

        const session = payload.data.object as Stripe.Identity.VerificationSession;
        await handleIdentityVerificationSessionVerified(session);

        logger.log("identity.verification_session.verified handled", {
            eventId: payload.eventId,
            sessionId: session.id,
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

        logger.log("Processing identity.verification_session.requires_input", {
            eventId: payload.eventId,
        });

        const session = payload.data.object as Stripe.Identity.VerificationSession;
        await handleIdentityVerificationSessionRequiresInput(session);

        logger.log("identity.verification_session.requires_input handled", {
            eventId: payload.eventId,
            sessionId: session.id,
            errorCode: session.last_error?.code ?? null,
        });
    },
});
