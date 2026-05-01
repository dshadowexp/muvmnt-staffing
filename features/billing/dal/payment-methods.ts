import "server-only";

import { env } from "@/data/env/server";
import { getSession } from "@/lib/get-session";
import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/supabase/server";
import { getStripeServer } from "@/services/stripe/server";
import { getLocale } from "next-intl/server";
import { OPERATOR_ROLE } from "@/features/auth/types";

// ─── Facility resolution (session + operators fallback for onboarding) ─────

/** Prefer `session.facilityId`; else first non-null `operators.facility_id` for client users. */
export async function resolveFacilityIdForBillingSession(): Promise<string | null> {
    const session = await getSession();
    if (!session) return null;
    if (session.facilityId) return session.facilityId;
    if (session.role !== OPERATOR_ROLE) return null;

    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("operators")
        .select("facility_id")
        .eq("user_id", session.userId)
        .not("facility_id", "is", null)
        .limit(1)
        .maybeSingle();

    return data?.facility_id ?? null;
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Fetch billing_accounts for a facility (Stripe customer id). */
export async function getBillingAccountForFacility(facilityId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data) return { error: null, data: null };
    return { data: { customerId: data.stripe_customer_id } };
}

export async function getBillingAccount() {
    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { error: "No facility in session" };
    return getBillingAccountForFacility(facilityId);
}

export async function hasPaymentMethodForFacility(facilityId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data || !data.stripe_customer_id) return { data: false };

    const methods = await getStripeServer().paymentMethods.list({
        customer: data.stripe_customer_id,
    });
    return { data: methods.data.length > 0 };
}

export async function hasPaymentMethod() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };
    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { data: false };
    return hasPaymentMethodForFacility(facilityId);
}

export type DefaultCardSummary = {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
};

/** Default card on file for a facility's Stripe customer, if any. */
export async function getDefaultPaymentMethodSummaryForFacility(
    facilityId: string,
): Promise<DefaultCardSummary | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data?.stripe_customer_id) return null;

    const stripe = getStripeServer();
    const customer = await stripe.customers.retrieve(data.stripe_customer_id, {
        expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return null;

    const def = customer.invoice_settings?.default_payment_method;
    if (def && typeof def !== "string" && def.card) {
        return {
            brand: def.card.brand,
            last4: def.card.last4,
            expMonth: def.card.exp_month,
            expYear: def.card.exp_year,
        };
    }

    const methods = await stripe.paymentMethods.list({
        customer: data.stripe_customer_id,
        type: "card",
    });
    const card = methods.data[0]?.card;
    if (!card) return null;
    return {
        brand: card.brand,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
    };
}

// ─── Stripe invoices ─────────────────────────────────────────────────────────

export type StripeInvoiceSummary = {
    id: string;
    number: string | null;
    status: string | null;
    total: number;
    currency: string;
    created: number;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
};

export async function listStripeInvoicesForFacility(
    facilityId: string,
    limit = 24,
): Promise<StripeInvoiceSummary[]> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data?.stripe_customer_id) return [];

    const stripe = getStripeServer();
    const res = await stripe.invoices.list({
        customer: data.stripe_customer_id,
        limit,
    });

    return res.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        total: inv.total,
        currency: inv.currency,
        created: inv.created,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
    }));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function ensureStripeCustomerForFacility(
    facilityId: string,
): Promise<{
    error: string | null;
    customerId: string | null;
}> {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized", customerId: null };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error) return { error: error.message, customerId: null };

    if (!data) {
        const customer = await getStripeServer().customers.create({
            email: user.email ?? "",
            metadata: { facilityId },
        });
        const { error: insErr } = await supabase.from("billing_accounts").insert({
            facility_id: facilityId,
            stripe_customer_id: customer.id,
        });
        if (insErr) return { error: insErr.message, customerId: null };
        return { error: null, customerId: customer.id };
    }

    if (!data.stripe_customer_id) {
        const customer = await getStripeServer().customers.create({
            email: user.email ?? "",
            metadata: { facilityId },
        });
        const { error: upErr } = await supabase
            .from("billing_accounts")
            .update({ stripe_customer_id: customer.id })
            .eq("facility_id", facilityId);
        if (upErr) return { error: upErr.message, customerId: null };
        return { error: null, customerId: customer.id };
    }

    return { error: null, customerId: data.stripe_customer_id };
}

export async function ensureStripeCustomerForBillingUser(): Promise<{
    error: string | null;
    customerId: string | null;
}> {
    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { error: "No facility in session", customerId: null };
    return ensureStripeCustomerForFacility(facilityId);
}

export async function createPortalSession(): Promise<
    | { error: string; data: null }
    | { error: null; data: { url: string } }
> {
    const locale = await getLocale();
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthenticated", data: null };

    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { error: "No facility in session", data: null };

    const ensured = await ensureStripeCustomerForFacility(facilityId);
    if (ensured.error || !ensured.customerId) {
        return { error: ensured.error ?? "Billing account not setup", data: null };
    }

    const portalSession = await getStripeServer().billingPortal.sessions.create({
        customer: ensured.customerId,
        return_url: `${env.APP_URL}${user.is_active ? "/app/billing" : "/onboarding/billing"}`,
        locale: locale as any,
    });

    if (!portalSession.url) {
        return { error: "Stripe did not return a portal URL", data: null };
    }

    return { error: null, data: { url: portalSession.url } };
}
