"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer, STRIPE_PRICE_IDS } from "@/services/stripe/server";
import { env } from "@/data/env/server";
import { parseAddress } from "@/lib/formatters";

export async function createSetupIntent() {
    const { user } = await getCurrentUser({ allData: true });
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

export async function createConnectedAccountLink() {
    const { user } = await getCurrentUser({ allData: true });
    if (!user) return { error: "Unauthorized" };
    if (user.role !== 'worker') return { error: "Unauthorized" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('payroll_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') return { error: error.message };

    const { data: workerProfileData, error: workerProfileError } = await supabase.from('workers').select('*').eq('user_id', user.id).single();
    if (workerProfileError && workerProfileError.code !== 'PGRST116') return { error: workerProfileError.message };
    if (!workerProfileData) return { error: 'Your profile is not completed' };

    let stripeAccountId;
    if (!data) {
        const account = await getStripeServer().accounts.create({
            type: 'express',
            country: 'CA',
            email: user.email ?? "",
            business_type: 'individual',
            capabilities: {
                transfers: { requested: true },
            },
            business_profile: {
                mcc: '7361',
                name: `${workerProfileData.first_name} ${workerProfileData.last_name}`,
                product_description: 'Temporary staffing agency',
                support_email: user.email ?? "",
            },
            tos_acceptance: {
                service_agreement: 'recipient',
            }
        });

        await supabase.from('payroll_accounts').insert({
            user_id: user.id,
            stripe_account_id: account.id,
        });

        stripeAccountId = account.id;
    } else {
        stripeAccountId = data.stripe_account_id;
    }
    // TODO: Add address and format to get line1, city, state, postal_code
    const { data: locationData, error: locationError } = await supabase.from('locations').select('*').eq('user_id', user.id).single();
    if (locationError && locationError.code !== 'PGRST116') return { error: locationError.message };
    if (!locationData) return { error: 'Your location is not completed' };
    const address = parseAddress(locationData.address);

    await getStripeServer().accounts.createPerson(stripeAccountId, {
        first_name: workerProfileData.first_name,
        last_name: workerProfileData.last_name,
        email: user.email ?? "",
        phone: user.phone_number ?? "",
        address: {
            line1: address.street ?? "",
            city: address.city ?? "",
            state: address.province ?? "",
            postal_code: address.postalCode ?? "",
            country: address.country ?? "",
        },
        relationship: {
            representative: true,
        }
    });

    const link = await getStripeServer().accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${env.APP_URL}/app/onboarding/payroll`,
        return_url: `${env.APP_URL}/app/onboarding/payroll`,
        type: 'account_onboarding',
        collect: 'eventually_due',
    });

    return { data: { onboardingUrl: link.url } };
}

export async function createCheckoutSession(priceId: string) {
    const { user } = await getCurrentUser();
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
    const { user } = await getCurrentUser();
    if (!user) throw new Error('Unauthenticated');

    const supabase = await createAdminClient();
    const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("user_id", user.id).single();
    if (!userBillingAccount || !userBillingAccount.stripe_customer_id) throw new Error('Billing account not setup');

    const portalSession = await getStripeServer().billingPortal.sessions.create({
        customer: userBillingAccount.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return { data: { url: portalSession.url } };
}

export async function setDefaultPayment(paymentMethodId: string) {
    const { user } = await getCurrentUser();
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

    if (!owned) throw new Error('Payment method not found on this account');

    await supabase.from('billing_accounts').update({
        default_payment_method_id: paymentMethodId,
    }).eq('user_id', user.id);

    return { data: { success: true } };
}

export async function deletePaymentMethod(paymentMethodId: string) {
    const { user } = await getCurrentUser({ allData: true });
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

    if (!owned) throw new Error('Payment method not found on this account')

    await getStripeServer().paymentMethods.detach(paymentMethodId);

    // Clear default if the removed card was the default
    if (data.default_payment_method_id === paymentMethodId) {
      await supabase.from('billing_accounts').update({
        default_payment_method_id: null,
      }).eq('user_id', user.id);
    }

    return { data: { success: true } };
}

