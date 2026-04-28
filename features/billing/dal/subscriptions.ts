import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { SubscriptionPlan } from "@/services/stripe/server";

export type SubscriptionRow = {
    id: string;
    facility_id: string;
    plan: SubscriptionPlan;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    canceled_at: string | null;
    seats_limit: number;
    screenings_limit: number;
    interviews_limit: number;
    created_at: string;
    updated_at: string;
};

/** Fetch the active subscription for a facility. Returns null if none. */
export async function getSubscription(facilityId: string): Promise<SubscriptionRow | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return (data ?? null) as SubscriptionRow | null;
}

/** Fetch subscription by Stripe subscription ID (used in webhook handlers). */
export async function getSubscriptionByStripeId(
    stripeSubscriptionId: string,
): Promise<SubscriptionRow | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return (data ?? null) as SubscriptionRow | null;
}

export type UpsertSubscriptionInput = {
    facilityId: string;
    plan: SubscriptionPlan;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    status: string;
    currentPeriodStart: number; // Unix timestamp
    currentPeriodEnd: number;   // Unix timestamp
};

/** Create or update the subscription row for a facility. */
export async function upsertSubscription(input: UpsertSubscriptionInput): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from("subscriptions")
        .upsert(
            {
                facility_id: input.facilityId,
                plan: input.plan,
                stripe_subscription_id: input.stripeSubscriptionId,
                stripe_customer_id: input.stripeCustomerId,
                status: input.status,
                current_period_start: new Date(input.currentPeriodStart * 1000).toISOString(),
                current_period_end: new Date(input.currentPeriodEnd * 1000).toISOString(),
                canceled_at: null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "facility_id" },
        );

    if (error) throw new Error(error.message);
}

/** Mark a subscription as canceled. */
export async function cancelSubscription(
    stripeSubscriptionId: string,
    canceledAt: number, // Unix timestamp
): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from("subscriptions")
        .update({
            status: "canceled",
            canceled_at: new Date(canceledAt * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", stripeSubscriptionId);

    if (error) throw new Error(error.message);
}

/** Update subscription status only (e.g., past_due, unpaid). */
export async function updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from("subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", stripeSubscriptionId);

    if (error) throw new Error(error.message);
}
