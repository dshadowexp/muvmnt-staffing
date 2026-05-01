"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import {
    getStripeServer,
    getPriceId,
    type SubscriptionPlan,
    type BillingPeriod,
} from "@/services/stripe/server";
import {
    createPortalSession,
    ensureStripeCustomerForFacility,
} from "@/features/billing/dal/payment-methods";

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

    const supabase = await createAdminClient();
    const { data: op } = await supabase
        .from("operators")
        .select("facility_id")
        .eq("user_id", session.userId)
        .eq("permission", "owner")
        .maybeSingle();

    if (!op?.facility_id) return { error: "No facility found for this account" };

    const ensured = await ensureStripeCustomerForFacility(op.facility_id);
    if (ensured.error || !ensured.customerId) {
        return { error: ensured.error ?? "Billing account not setup" };
    }

    const checkoutSession = await getStripeServer().checkout.sessions.create({
        customer: ensured.customerId,
        payment_method_types: ["card", "link"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?subscription=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
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
