import "server-only";

import type Stripe from "stripe";

/**
 * Placeholder for `customer.subscription.deleted`.
 *
 * Clear `billing_accounts.stripe_current_period_end` when the subscription
 * terminates (once the subscription model is enabled).
 */
export async function handleSubscriptionDeleted(
    _subscription: Stripe.Subscription,
): Promise<void> {
    return;
}
