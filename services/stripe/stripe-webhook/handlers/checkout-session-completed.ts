import "server-only";

import type Stripe from "stripe";
import { tasks } from "@trigger.dev/sdk/v3";

import type { finalizeAfterCheckoutTask } from "@/trigger/staff-requests";
import type { stripeSubscriptionCreatedTask } from "@/trigger/stripe/subscription-created";

/**
 * `checkout.session.completed` router.
 *
 * Branches on `metadata.kind`:
 * - "staff_request"  → finalize-after-checkout (record payment, materialize shifts)
 * - "subscription"   → subscription-created task (upsert subscriptions row)
 */
export async function handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
): Promise<void> {
    const kind = session.metadata?.kind;
    const staffRequestId = session.metadata?.staff_request_id;

    if (kind === "staff_request" && staffRequestId) {
        await tasks.trigger<typeof finalizeAfterCheckoutTask>(
            "staff-requests.finalize-after-checkout",
            { requestId: staffRequestId, sessionId: session.id },
            {
                tags: [`staff-request:${staffRequestId}`],
                idempotencyKey: `staff-request-checkout:${session.id}`,
            },
        );
        return;
    }

    if (kind === "subscription") {
        const facilityId = session.metadata?.facilityId;
        const plan = session.metadata?.plan;
        const subscriptionId =
            typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id;

        if (facilityId && plan && subscriptionId) {
            await tasks.trigger<typeof stripeSubscriptionCreatedTask>(
                "stripe.subscription.created",
                {
                    facilityId,
                    plan,
                    subscriptionId,
                    customerId: typeof session.customer === "string"
                        ? session.customer
                        : (session.customer?.id ?? ""),
                    sessionId: session.id,
                },
                {
                    tags: [`facility:${facilityId}`, `plan:${plan}`],
                    idempotencyKey: `subscription-checkout:${session.id}`,
                },
            );
        }
        return;
    }
}
