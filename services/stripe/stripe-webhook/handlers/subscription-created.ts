import "server-only";

import type Stripe from "stripe";
import { upsertSubscription } from "@/features/billing/dal/subscriptions";
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

    const item = subscription.items.data[0];

    await upsertSubscription({
        facilityId,
        plan,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodStart: item?.period?.start ?? subscription.current_period_start,
        currentPeriodEnd: item?.period?.end ?? subscription.current_period_end,
    });
}
