import "server-only";

import type Stripe from "stripe";
import { tasks } from "@trigger.dev/sdk/v3";

import { toWebhookJobPayload, type StripeWebhookJobPayload } from "./schemas";

// Type-only imports keep the Trigger.dev task code out of the Next.js bundle
// while preserving full type-safety at the call site.
import type { stripeAccountUpdatedTask } from "@/trigger/stripe/account-updated";
import type { stripeCheckoutSessionCompletedTask } from "@/trigger/stripe/checkout-session-completed";
import type { stripeSubscriptionUpdatedTask } from "@/trigger/stripe/subscription-updated";
import type { stripeSubscriptionDeletedTask } from "@/trigger/stripe/subscription-deleted";

/**
 * Typed registry of Stripe event → Trigger.dev task binding.
 *
 * Each entry declares both the task id (runtime) and the task type
 * (compile-time), so {@link dispatchStripeEvent} gets full type-safety on
 * the payload without importing the task runtime into this bundle.
 */
type EventBinding<T> = { id: string; __task?: T };

const BINDINGS = {
    "account.updated": { id: "stripe.account.updated" } satisfies EventBinding<typeof stripeAccountUpdatedTask>,
    "checkout.session.completed": { id: "stripe.checkout.session.completed" } satisfies EventBinding<typeof stripeCheckoutSessionCompletedTask>,
    "customer.subscription.updated": { id: "stripe.customer.subscription.updated" } satisfies EventBinding<typeof stripeSubscriptionUpdatedTask>,
    "customer.subscription.deleted": { id: "stripe.customer.subscription.deleted" } satisfies EventBinding<typeof stripeSubscriptionDeletedTask>,
} as const;

type HandledEventType = keyof typeof BINDINGS;

export type StripeDispatchResult =
    | { status: "enqueued"; taskId: string; runId: string }
    | { status: "skipped"; reason: "unhandled-event-type" };

/**
 * Enqueue a verified Stripe event onto the correct Trigger.dev task.
 *
 * - Uses the Stripe event id as `idempotencyKey` so Stripe's aggressive
 *   redelivery semantics never cause duplicate processing.
 * - Non-blocking: returns as soon as the task is accepted, keeping the HTTP
 *   handler well under Stripe's 10s webhook timeout.
 */
export async function dispatchStripeEvent(event: Stripe.Event): Promise<StripeDispatchResult> {
    const binding = BINDINGS[event.type as HandledEventType];
    if (!binding) {
        return { status: "skipped", reason: "unhandled-event-type" };
    }

    const payload: StripeWebhookJobPayload = toWebhookJobPayload(event);

    // Every handled task shares the same payload shape, so any task's type
    // gives the call the right compile-time contract.
    const handle = await tasks.trigger<typeof stripeAccountUpdatedTask>(
        binding.id as typeof stripeAccountUpdatedTask["id"],
        payload,
        {
            idempotencyKey: event.id,
            tags: [
                `stripe_type_${event.type.replace(/\./g, "_")}`,
                event.livemode ? "stripe_live" : "stripe_test",
            ],
        },
    );

    return { status: "enqueued", taskId: binding.id, runId: handle.id };
}
