import "server-only";

import type Stripe from "stripe";
import { upsertSubscription, getSubscriptionByStripeId } from "@/features/billing/dal/subscriptions";
import { STRIPE_PRICE_IDS } from "@/services/stripe/server";
import type { SubscriptionPlan } from "@/services/stripe/server";

/**
 * `customer.subscription.updated` handler.
 *
 * Handles plan changes, renewals, and status transitions (past_due → active etc.).
 * Falls back to the existing DB row's facilityId if metadata is missing on the
 * update event (Stripe doesn't always re-populate metadata on updates).
 */
export async function handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
): Promise<void> {
    // Resolve facilityId + plan — prefer webhook metadata, fall back to DB row.
    let facilityId: string | undefined = subscription.metadata?.facilityId;
    let plan: SubscriptionPlan | undefined =
        subscription.metadata?.plan as SubscriptionPlan | undefined;

    if (!facilityId || !plan) {
        const existing = await getSubscriptionByStripeId(subscription.id);
        if (!existing) return; // Not a subscription we originated
        facilityId = existing.facility_id;
        plan = existing.plan;
    }

    // After the block above, both are guaranteed to be set.
    if (!facilityId || !plan) return;

    // Derive plan from the current price (covers mid-period upgrades where
    // Stripe carries the old metadata but the price has already changed).
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId) {
        const matched = (Object.entries(STRIPE_PRICE_IDS) as [SubscriptionPlan, string][]).find(
            ([, id]) => id === priceId,
        );
        if (matched) plan = matched[0];
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
