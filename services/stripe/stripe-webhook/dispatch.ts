import "server-only";

import type Stripe from "stripe";
import { tasks } from "@trigger.dev/sdk/v3";

import { toWebhookJobPayload, type StripeWebhookJobPayload } from "./schemas";

// Type-only imports keep the Trigger.dev task code out of the Next.js bundle
// while preserving full type-safety at the call site.
import { stripeAccountUpdatedTask } from "@/trigger/stripe/account-updated";
import { stripeCheckoutSessionCompletedTask } from "@/trigger/stripe/checkout-session-completed";
import { stripeIdentityVerificationSessionRequiresInputTask, stripeIdentityVerificationSessionVerifiedTask } from "@/trigger/stripe/identity-verification-session";
import { stripeInvoicePaymentSucceededTask } from "@/trigger/stripe/invoice-payment-succeeded";
import { stripeInvoicePaymentFailedTask } from "@/trigger/stripe/invoice-payment-failed";
import { stripeSubscriptionUpdatedTask } from "@/trigger/stripe/subscription-updated";
import { stripeSubscriptionDeletedTask } from "@/trigger/stripe/subscription-deleted";

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
    "identity.verification_session.verified": { id: "stripe.identity.verification_session.verified" } satisfies EventBinding<typeof stripeIdentityVerificationSessionVerifiedTask>,
    "identity.verification_session.requires_input": { id: "stripe.identity.verification_session.requires_input" } satisfies EventBinding<typeof stripeIdentityVerificationSessionRequiresInputTask>,
    "invoice.payment_succeeded": { id: "stripe.invoice.payment_succeeded" } satisfies EventBinding<typeof stripeInvoicePaymentSucceededTask>,
    "invoice.payment_failed": { id: "stripe.invoice.payment_failed" } satisfies EventBinding<typeof stripeInvoicePaymentFailedTask>,
    "customer.subscription.updated": { id: "stripe.subscription.updated" } satisfies EventBinding<typeof stripeSubscriptionUpdatedTask>,
    "customer.subscription.deleted": { id: "stripe.subscription.deleted" } satisfies EventBinding<typeof stripeSubscriptionDeletedTask>,
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
    let task: any | undefined;
    switch (event.type) {
        case "account.updated":
            task = stripeAccountUpdatedTask;
            break;
        case "checkout.session.completed":
            task = stripeCheckoutSessionCompletedTask;
            break;
        case "identity.verification_session.verified":
            task = stripeIdentityVerificationSessionVerifiedTask;
            break;
        case "identity.verification_session.requires_input":
            task = stripeIdentityVerificationSessionRequiresInputTask;
            break;
        case "invoice.payment_succeeded":
            task = stripeInvoicePaymentSucceededTask;
            break;
        case "invoice.payment_failed":
            task = stripeInvoicePaymentFailedTask;
            break;
        case "customer.subscription.updated":
            task = stripeSubscriptionUpdatedTask;
            break;
        case "customer.subscription.deleted":
            task = stripeSubscriptionDeletedTask;
            break;
        default:
            break;
    }

    if (!task) {
        return { status: "skipped", reason: "unhandled-event-type" };
    }

    const handle = await tasks.trigger<typeof task>(task.id, payload, {
        idempotencyKey: event.id,
        tags: [
            `stripe_type_${event.type.replace(/\./g, "_")}`,
            event.livemode ? "stripe_live" : "stripe_test",
        ],
    });

    return { status: "enqueued", taskId: binding.id, runId: handle.id };
}
