import "server-only";

import type Stripe from "stripe";

/**
 * Placeholder for `customer.subscription.updated`.
 *
 * Reconcile `billing_accounts.stripe_current_period_end` + price id here
 * once the subscription model is enabled.
 */
export async function handleSubscriptionUpdated(
    _subscription: Stripe.Subscription,
): Promise<void> {
    return;
}
