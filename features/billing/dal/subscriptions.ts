import "server-only";

import { createAdminClient } from "@/supabase/server";
import type { Database, TablesInsert } from "@/supabase/types/database";
import type { SubscriptionPlan } from "@/services/stripe/server";

/** Persisted `subscriptions.status` — matches Postgres enum `subscription_status`. */
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

/** Maps Stripe `subscription.status` strings into our DB enum. */
export function subscriptionStatusFromStripe(status: string): SubscriptionStatus {
    switch (status) {
        case "trialing":
        case "active":
        case "past_due":
        case "canceled":
        case "incomplete":
        case "unpaid":
            return status;
        case "incomplete_expired":
            return "canceled";
        case "paused":
            return "active";
        default:
            throw new Error(`Unknown Stripe subscription status: ${status}`);
    }
}

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

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
    status: string;
    currentPeriodStart: number; // Unix timestamp
    currentPeriodEnd: number; // Unix timestamp
    stripePriceId?: string | null;
};

/** Create or update the subscription row for a facility. */
export async function upsertSubscription(input: UpsertSubscriptionInput): Promise<void> {
    const supabase = await createAdminClient();

    const row: TablesInsert<"subscriptions"> = {
        facility_id: input.facilityId,
        plan: input.plan,
        stripe_subscription_id: input.stripeSubscriptionId,
        stripe_price_id: input.stripePriceId ?? null,
        status: subscriptionStatusFromStripe(input.status),
        current_period_start: new Date(input.currentPeriodStart * 1000).toISOString(),
        current_period_end: new Date(input.currentPeriodEnd * 1000).toISOString(),
        canceled_at: null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "facility_id" });

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
    status: SubscriptionStatus,
): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from("subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", stripeSubscriptionId);

    if (error) throw new Error(error.message);
}
