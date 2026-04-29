import type Stripe from "stripe";

/**
 * Stripe API v20+ exposes billing period bounds on each subscription item, not on the subscription root.
 */
export function subscriptionPeriodUnixBounds(
    subscription: Stripe.Subscription,
): { start: number; end: number } | null {
    const item = subscription.items.data[0];
    if (!item) return null;
    return {
        start: item.current_period_start,
        end: item.current_period_end,
    };
}
