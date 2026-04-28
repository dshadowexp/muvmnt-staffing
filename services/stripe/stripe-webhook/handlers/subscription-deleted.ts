import "server-only";

import type Stripe from "stripe";
import { cancelSubscription } from "@/features/billing/dal/subscriptions";

/**
 * `customer.subscription.deleted` handler.
 *
 * Marks the subscription row as canceled. The facility loses entitlements
 * on their next feature-gate check.
 */
export async function handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
): Promise<void> {
    await cancelSubscription(
        subscription.id,
        subscription.canceled_at ?? Math.floor(Date.now() / 1000),
    );
}
