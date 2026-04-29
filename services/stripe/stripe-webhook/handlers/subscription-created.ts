import "server-only";

import type Stripe from "stripe";
import { upsertSubscription } from "@/features/billing/dal/subscriptions";
import { subscriptionPeriodUnixBounds } from "@/services/stripe/subscription-period";
import type { SubscriptionPlan } from "@/services/stripe/server";

/**
 * `customer.subscription.created` handler.
 *
 * Persists the new subscription to the `subscriptions` table, keyed by the
 * facility ID stored in the originating checkout session's metadata.
 */
export async function handleSubscriptionCreated(
    subscription: Stripe.Subscription,
): Promise<void> {
    const facilityId = subscription.metadata?.facilityId;
    const plan = subscription.metadata?.plan as SubscriptionPlan | undefined;

    if (!facilityId || !plan) {
        // Not a subscription we originated — nothing to do.
        return;
    }

    const bounds = subscriptionPeriodUnixBounds(subscription);
    if (!bounds) return;

    await upsertSubscription({
        facilityId,
        plan,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: bounds.start,
        currentPeriodEnd: bounds.end,
        stripePriceId: subscription.items.data[0]?.price?.id ?? null,
    });
}
