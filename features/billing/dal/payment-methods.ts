import "server-only";

import { env } from "@/data/env/server";
import { getSession } from "@/lib/get-session";
import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer } from "@/services/stripe/server";
import { getLocale } from "next-intl/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch the billing_accounts row for the current user (stripe customer id). */
export async function getBillingAccount() {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("user_id", session.userId)
        .single();

    if (error) return { error: error.message };
    if (!data) return { error: null, data: null };
    return { data: { customerId: data.stripe_customer_id } };
}

/** Returns true if the current user has at least one payment method on file. */
export async function hasPaymentMethod() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("user_id", session.userId)
        .single();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data || !data.stripe_customer_id) return { data: false };

    const methods = await getStripeServer().paymentMethods.list({
        customer: data.stripe_customer_id,
    });
    return { data: methods.data.length > 0 };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Ensures a billing_accounts row + Stripe customer exists for the current user.
 * Creates both if missing.
 */
export async function ensureStripeCustomerForBillingUser(): Promise<{
    error: string | null;
    customerId: string | null;
}> {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized", customerId: null };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) return { error: error.message, customerId: null };

    if (!data) {
        const customer = await getStripeServer().customers.create({
            email: user.email ?? "",
            metadata: { userId: user.id },
        });
        const { error: insErr } = await supabase.from("billing_accounts").insert({
            user_id: user.id,
            stripe_customer_id: customer.id,
        });
        if (insErr) return { error: insErr.message, customerId: null };
        return { error: null, customerId: customer.id };
    }

    if (!data.stripe_customer_id) {
        const customer = await getStripeServer().customers.create({
            email: user.email ?? "",
            metadata: { userId: user.id },
        });
        const { error: upErr } = await supabase
            .from("billing_accounts")
            .update({ stripe_customer_id: customer.id })
            .eq("user_id", user.id);
        if (upErr) return { error: upErr.message, customerId: null };
        return { error: null, customerId: customer.id };
    }

    return { error: null, customerId: data.stripe_customer_id };
}

/** Creates a Stripe Customer Portal session for managing payment methods / subscriptions. */
export async function createPortalSession(): Promise<
    | { error: string; data: null }
    | { error: null; data: { url: string } }
> {
    const locale = await getLocale();
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthenticated", data: null };

    const ensured = await ensureStripeCustomerForBillingUser();
    if (ensured.error || !ensured.customerId) {
        return { error: ensured.error ?? "Billing account not setup", data: null };
    }

    const portalSession = await getStripeServer().billingPortal.sessions.create({
        customer: ensured.customerId,
        return_url: `${env.APP_URL}${user.is_active ? "/dashboard/account" : "/onboarding/billing"}`,
        locale: locale as any,
    });

    if (!portalSession.url) {
        return { error: "Stripe did not return a portal URL", data: null };
    }

    return { error: null, data: { url: portalSession.url } };
}
