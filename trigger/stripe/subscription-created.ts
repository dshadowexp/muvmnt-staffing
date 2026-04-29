import { logger, task } from "@trigger.dev/sdk/v3";
import { upsertSubscription } from "@/features/billing/dal/subscriptions";
import { subscriptionPeriodUnixBounds } from "@/services/stripe/subscription-period";
import { getStripeServer } from "@/services/stripe/server";
import type { SubscriptionPlan } from "@/services/stripe/server";

/**
 * Fired when a subscription checkout completes (kind = "subscription").
 *
 * Uses the Stripe API to read the full subscription object so we always have
 * accurate period timestamps — the checkout session doesn't include them.
 */
export const stripeSubscriptionCreatedTask = task({
    id: "stripe.subscription.created",
    maxDuration: 60,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 2_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (payload: {
        facilityId: string;
        plan: string;
        subscriptionId: string;
        customerId: string;
        sessionId: string;
    }) => {
        logger.log("Processing subscription.created", {
            facilityId: payload.facilityId,
            plan: payload.plan,
            subscriptionId: payload.subscriptionId,
        });

        const subscription = await getStripeServer().subscriptions.retrieve(
            payload.subscriptionId,
        );

        const bounds = subscriptionPeriodUnixBounds(subscription);
        if (!bounds) {
            logger.error("Stripe subscription has no items; cannot upsert period", {
                subscriptionId: subscription.id,
            });
            throw new Error("Stripe subscription has no subscription items");
        }

        await upsertSubscription({
            facilityId: payload.facilityId,
            plan: payload.plan as SubscriptionPlan,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: bounds.start,
            currentPeriodEnd: bounds.end,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
        });

        logger.log("Subscription row upserted", {
            facilityId: payload.facilityId,
            plan: payload.plan,
            status: subscription.status,
        });

        return { facilityId: payload.facilityId, plan: payload.plan, ok: true };
    },
});
