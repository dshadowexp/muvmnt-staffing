"use server";

import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer, STRIPE_PRICE_IDS } from "@/services/stripe/server";

export async function createSetupIntent() {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('billing_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') return { error: error.message };

    let stripeCustomerId;
    if (!data) {
        const customer = await getStripeServer().customers.create({
            email: user.email ?? "",
            metadata: {
                userId: user.id
            }
        });
    
        await supabase.from('billing_accounts').insert({
            user_id: user.id,
            stripe_customer_id: customer.id,
        });

        stripeCustomerId = customer.id;
    } else {
        stripeCustomerId = data.stripe_customer_id;
    }

    if (data?.stripe_customer_id) {
        const existingPms = await getStripeServer().paymentMethods.list({
            customer: data.stripe_customer_id,
        });
        if (existingPms.data.length >= 3) {
            return { error: "You can save up to 3 payment methods." };
        }
    }

    const intent = await getStripeServer().setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        automatic_payment_methods: {
            enabled: false,
        },
    });

    if (!intent.client_secret) throw new Error('Stripe did not return a client secret');

    return { data: { clientSecret: intent.client_secret } };
}

/**
 * After a successful SetupIntent, optionally set the new payment method as default on Stripe
 * and in `billing_accounts`. When `setAsDefault` is omitted, defaults to true only if this is
 * the customer's first saved card (so adding a 2nd/3rd card does not steal default).
 */
export async function syncDefaultPaymentMethodAfterSetupIntent(
    setupIntentId: string,
    options?: { setAsDefault?: boolean },
) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" as const };

    const id = setupIntentId?.trim();
    if (!id) return { error: "Invalid setup intent" as const };

    const supabase = await createAdminClient();
    const { data: row, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .single();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!row?.stripe_customer_id) return { error: "Billing account not setup" as const };

    const si = await getStripeServer().setupIntents.retrieve(id);

    const customerOnIntent =
        typeof si.customer === "string" ? si.customer : si.customer?.id;
    if (!customerOnIntent || customerOnIntent !== row.stripe_customer_id) {
        return { error: "Setup intent does not belong to this account" as const };
    }

    if (si.status !== "succeeded") {
        return { error: "Setup was not completed" as const };
    }

    const pmId =
        typeof si.payment_method === "string"
            ? si.payment_method
            : si.payment_method?.id;
    if (!pmId) return { error: "No payment method on setup intent" as const };

    await getStripeServer().customers.update(row.stripe_customer_id, {
        invoice_settings: { default_payment_method: pmId },
    });

    const { error: upErr } = await supabase
        .from("billing_accounts")
        .update({ default_payment_method_id: pmId })
        .eq("user_id", user.id);

    if (upErr) return { error: upErr.message };

    return { data: { paymentMethodId: pmId } };
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

export async function createPortalSession() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthenticated');

    const supabase = await createAdminClient();
    const { data: userBillingAccount } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (!userBillingAccount || !userBillingAccount.stripe_customer_id) throw new Error('Billing account not setup');

    const portalSession = await getStripeServer().billingPortal.sessions.create({
        customer: userBillingAccount.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return { data: { url: portalSession.url } };
}

export async function setDefaultPayment(paymentMethodId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('billing_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') return { error: error.message };
    if (!data || !data.stripe_customer_id) return { error: "Billing account not setup" };

    const methods = await getStripeServer().paymentMethods.list({ 
        customer: data.stripe_customer_id 
    });
    const owned   = methods.data.some((pm) => pm.id === paymentMethodId);

    if (!owned) return { error: "Payment method not found on this account" };

    await getStripeServer().customers.update(data.stripe_customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
    });

    await supabase.from('billing_accounts').update({
        default_payment_method_id: paymentMethodId,
    }).eq('user_id', user.id);

    return { data: { success: true } };
}

export async function deletePaymentMethod(paymentMethodId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('billing_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') return { error: error.message };
    if (!data || !data.stripe_customer_id) return { error: "Billing account not setup" };

    const methods = await getStripeServer().paymentMethods.list({ 
        customer: data.stripe_customer_id 
    });
    const owned   = methods.data.some((pm) => pm.id === paymentMethodId);

    if (!owned) return { error: "Payment method not found on this account" };

    await getStripeServer().paymentMethods.detach(paymentMethodId);

    const remaining = await getStripeServer().paymentMethods.list({
        customer: data.stripe_customer_id,
    });
    const nextDefaultId =
        data.default_payment_method_id === paymentMethodId
            ? (remaining.data[0]?.id ?? null)
            : data.default_payment_method_id;

    await getStripeServer().customers.update(data.stripe_customer_id, {
        invoice_settings: {
            default_payment_method: nextDefaultId ?? undefined,
        },
    });

    await supabase.from("billing_accounts").update({
        default_payment_method_id: nextDefaultId,
    }).eq("user_id", user.id);

    return { data: { success: true } };
}

