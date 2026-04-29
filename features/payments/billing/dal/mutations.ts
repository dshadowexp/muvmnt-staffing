"use server";

import { env } from "@/data/env/server";
import { getCurrentUser } from "@/features/users/dal/queries";
import { getStripeServer, STRIPE_PRICE_IDS } from "@/services/stripe/server";
import { getLocale } from "next-intl/server";
import {
    ensureStripeCustomerForFacility,
    resolveFacilityIdForBillingSession,
} from "@/features/billing/dal/payment-methods";

async function ensureStripeCustomerForCurrentFacility(): Promise<{
    error: string | null;
    customerId: string | null;
}> {
    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { error: "No facility in session", customerId: null };
    return ensureStripeCustomerForFacility(facilityId);
}

export async function createSetupIntent() {
    const ensured = await ensureStripeCustomerForCurrentFacility();
    if (ensured.error || !ensured.customerId) {
        return { error: ensured.error ?? "Unauthorized" };
    }

    const existingPms = await getStripeServer().paymentMethods.list({
        customer: ensured.customerId,
    });
    if (existingPms.data.length >= 3) {
        return { error: "You can save up to 3 payment methods." };
    }

    const intent = await getStripeServer().setupIntents.create({
        customer: ensured.customerId,
        payment_method_types: ["card"],
        automatic_payment_methods: {
            enabled: false,
        },
    });

    if (!intent.client_secret) {
        throw new Error("Stripe did not return a client secret");
    }

    return { data: { clientSecret: intent.client_secret } };
}

export async function createCheckoutSession(priceId: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthenticated");

    if (!priceId || !(priceId in STRIPE_PRICE_IDS)) {
        return { error: "Invalid price ID" };
    }

    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) throw new Error("No facility in session");

    const ensured = await ensureStripeCustomerForFacility(facilityId);
    if (ensured.error || !ensured.customerId) {
        throw new Error(ensured.error ?? "Billing setup failed");
    }

    const customerId = ensured.customerId;

    const checkoutSession = await getStripeServer().checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
            {
                price: STRIPE_PRICE_IDS[priceId as keyof typeof STRIPE_PRICE_IDS],
                quantity: 1,
            },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
            userId: user.id,
            facilityId,
            priceId,
        },
    });

    return { data: { url: checkoutSession.url } };
}

export async function createPortalSession(): Promise<
    | { error: string; data: null }
    | { error: null; data: { url: string } }
> {
    const locale = await getLocale();
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthenticated", data: null };

    const ensured = await ensureStripeCustomerForCurrentFacility();
    if (ensured.error || !ensured.customerId) {
        return {
            error: ensured.error ?? "Billing account not setup",
            data: null,
        };
    }

    const portalSession = await getStripeServer().billingPortal.sessions.create({
        customer: ensured.customerId,
        return_url: `${env.APP_URL}${user.is_active ? "/dashboard/account" : "/onboarding/billing"}`,
        flow_data: {
            type: "payment_method_update",
        },
        locale: locale as any,
    });

    if (!portalSession.url) {
        return { error: "Stripe did not return a portal URL", data: null };
    }

    return { error: null, data: { url: portalSession.url } };
}
