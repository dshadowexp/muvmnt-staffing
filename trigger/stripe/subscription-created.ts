import { logger, task } from "@trigger.dev/sdk/v3";
import { upsertSubscription } from "@/features/billing/dal/subscriptions";
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

        const item = subscription.items.data[0];

        await upsertSubscription({
            facilityId: payload.facilityId,
            plan: payload.plan as SubscriptionPlan,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: payload.customerId,
            status: subscription.status,
            currentPeriodStart: item?.period?.start ?? subscription.current_period_start,
            currentPeriodEnd: item?.period?.end ?? subscription.current_period_end,
        });

        logger.log("Subscription row upserted", {
            facilityId: payload.facilityId,
            plan: payload.plan,
            status: subscription.status,
        });

        return { facilityId: payload.facilityId, plan: payload.plan, ok: true };
    },
});
