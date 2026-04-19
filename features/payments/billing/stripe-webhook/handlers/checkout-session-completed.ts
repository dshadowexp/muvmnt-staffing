import "server-only";

import type Stripe from "stripe";
import { tasks } from "@trigger.dev/sdk/v3";

import type { finalizeAfterCheckoutTask } from "@/trigger/staff-requests";

/**
 * `checkout.session.completed` router.
 *
 * For now we only handle staff-request hosted checkout payments — they carry
 * `metadata.kind = "staff_request"` and a `staff_request_id` we persisted on
 * `staff_requests.payment_session_id` when creating the session. Trigger.dev
 * then runs `finalize-after-checkout` (idempotent on `session.id`) to record
 * the payment, materialize shifts, and mark the request `confirmed`.
 *
 * Subscription / billing_accounts reconciliation can be appended below when
 * those flows go live — keep each branch self-contained.
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
}
