"use server";

import { auth as triggerAuth, runs } from "@trigger.dev/sdk/v3";
import { getSession } from "@/lib/get-session";
import { getSubscription } from "@/features/billing/dal/subscriptions";
import type { SubscriptionRow } from "@/features/billing/dal/subscriptions";
import { OPERATOR_ROLE } from "@/features/auth/types";

function subscriptionRowIsActive(sub: SubscriptionRow | null): boolean {
    if (!sub?.stripe_subscription_id) return false;
    return ["trialing", "active", "past_due"].includes(sub.status);
}

const IN_FLIGHT_STATUSES = new Set([
    "PENDING_VERSION",
    "QUEUED",
    "DEQUEUED",
    "EXECUTING",
    "WAITING",
    "DELAYED",
]);

export type SubscriptionCheckoutWatchState =
    | { phase: "unauthenticated" }
    | { phase: "complete" }
    | { phase: "track"; runId: string; publicAccessToken: string }
    | { phase: "pending" };

/**
 * Resolves how the dashboard should surface post-checkout subscription provisioning:
 * - `complete` — `subscriptions` row is already usable.
 * - `track` — a Trigger.dev run is in flight; the client can subscribe with Realtime (see coverage tracker).
 * - `pending` — poll until the DB row appears (webhook / task still running or list lookup missed).
 */
export async function getSubscriptionCheckoutWatchState(): Promise<SubscriptionCheckoutWatchState> {
    const session = await getSession();
    if (!session?.facilityId || session.role !== OPERATOR_ROLE) {
        return { phase: "unauthenticated" };
    }

    const facilityId = session.facilityId;
    const sub = await getSubscription(facilityId);
    if (subscriptionRowIsActive(sub)) {
        return { phase: "complete" };
    }

    try {
        const page = await runs.list({
            tag: `facility:${facilityId}`,
            taskIdentifier: "stripe.subscription.created",
            limit: 15,
        });

        const sorted = [...page.data].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        const latest = sorted[0];
        if (latest && IN_FLIGHT_STATUSES.has(latest.status)) {
            const publicAccessToken = await triggerAuth.createPublicToken({
                scopes: { read: { runs: [latest.id] } },
                expirationTime: "15m",
            });
            return { phase: "track", runId: latest.id, publicAccessToken };
        }
    } catch {
        /* Trigger list unavailable — fall back to polling the DB */
    }

    return { phase: "pending" };
}
