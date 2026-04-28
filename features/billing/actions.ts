"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import {
    getStripeServer,
    getPriceId,
    type SubscriptionPlan,
    type BillingPeriod,
} from "@/services/stripe/server";
import { createPortalSession, ensureStripeCustomerForBillingUser } from "@/features/billing/dal/payment-methods";

// ─── Portal ───────────────────────────────────────────────────────────────────

/** Opens Stripe Customer Portal — used from client onboarding / account page. */
export async function setupBillingPortalAction() {
    const res = await createPortalSession();
    if (res.error) throw new Error(res.error);
    if (!res.data?.url) throw new Error("Failed to create billing portal session");
    redirect(res.data.url);
}

// ─── Subscription checkout ────────────────────────────────────────────────────

/**
 * Starts a Stripe Checkout session for a subscription plan.
 * Accepts a billing period so the correct monthly or annual price is used.
 * Redirects to Stripe on success.
 */
export async function createSubscriptionCheckoutAction(
    plan: SubscriptionPlan,
    period: BillingPeriod = "monthly",
): Promise<{ error: string } | never> {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };

    const priceId = getPriceId(plan, period);
    if (!priceId) return { error: "Invalid plan" };

    // Resolve / create the Stripe customer
    const ensured = await ensureStripeCustomerForBillingUser();
    if (ensured.error || !ensured.customerId) {
        return { error: ensured.error ?? "Billing account not setup" };
    }

    // Resolve the facility this user operates
    const supabase = await createAdminClient();
    const { data: op } = await supabase
        .from("operators")
        .select("facility_id")
        .eq("user_id", session.userId)
        .eq("permission", "owner")
        .maybeSingle();

    if (!op) return { error: "No facility found for this account" };

    const checkoutSession = await getStripeServer().checkout.sessions.create({
        customer: ensured.customerId,
        automatic_payment_methods: { enabled: true },
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
            kind: "subscription",
            userId: session.userId,
            facilityId: op.facility_id,
            plan,
            period,
        },
    });

    if (!checkoutSession.url) return { error: "Stripe did not return a checkout URL" };

    redirect(checkoutSession.url);
}
