import { z } from "zod";
import type Stripe from "stripe";

/**
 * Minimal, serializable payload shape we send to Trigger.dev.
 *
 * We intentionally keep `data` typed as `unknown` here and narrow it at the
 * handler boundary — this keeps the wire contract small and avoids coupling
 * the queue payload to the full Stripe SDK types (which change per API
 * version).
 */
export const stripeWebhookJobSchema = z.object({
    eventId: z.string().min(1),
    type: z.string().min(1),
    livemode: z.boolean(),
    apiVersion: z.string().nullable().optional(),
    createdAt: z.number().int(),
    data: z.object({
        object: z.any(),
        previous_attributes: z.any().optional(),
    }),
});

export type StripeWebhookJobPayload = z.infer<typeof stripeWebhookJobSchema>;

/** Convenience factory from a verified Stripe event. */
export function toWebhookJobPayload(event: Stripe.Event): StripeWebhookJobPayload {
    return {
        eventId: event.id,
        type: event.type,
        livemode: event.livemode,
        apiVersion: event.api_version ?? null,
        createdAt: event.created,
        data: {
            object: event.data.object,
            previous_attributes: (event.data as { previous_attributes?: unknown }).previous_attributes,
        },
    };
}
