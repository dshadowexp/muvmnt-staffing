"use server";

import { env } from "@/data/env/server";
import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer, STRIPE_PRICE_IDS } from "@/services/stripe/server";
import { getLocale } from "next-intl/server";

/**
 * Ensures `billing_accounts` exists with a Stripe customer id (creates customer + row if needed).
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

export async function createSetupIntent() {
    const ensured = await ensureStripeCustomerForBillingUser();
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
    if (!user) throw new Error('Unauthenticated');

    if (!priceId || !(priceId in STRIPE_PRICE_IDS)) {
        return { error: "Invalid price ID" };
    }

    const supabase = await createAdminClient();

    const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("user_id", user.id).single();

    if (!userBillingAccount) {
        throw new Error('User not found');
    }

    let customerId = userBillingAccount.stripe_customer_id;

    if (!customerId) {
        const customer = await getStripeServer().customers.create({
            email: user.email ?? "",
            metadata: {
                userId: user.id,
            },
        })
        customerId = customer.id

        await supabase.from("billing_accounts").update({
            stripe_customer_id: customerId,
        }).eq("user_id", user.id);
    }

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
            priceId,
        },
    })

    return { data: { url: checkoutSession.url } };
}

export async function createPortalSession(): Promise<
    | { error: string; data: null }
    | { error: null; data: { url: string } }
> {
    const locale = await getLocale();
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthenticated", data: null };

    const ensured = await ensureStripeCustomerForBillingUser();
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