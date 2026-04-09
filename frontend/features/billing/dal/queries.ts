import { getSession } from "@/lib/get-session";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { getStripeServer } from "@/services/stripe/server";
import { createAdminClient } from "@/services/supabase/server";

export interface CardSummary {
    id:              string
    brand:           string
    last4:           string
    expMonth:        number
    expYear:         number
    isDefault:       boolean
}

export async function getBillingAccount() {
    const { user } = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('billing_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) return { error: error.message };
    if (!data) return { error: null, data: null };

    return { data: {
        customerId:             data.stripe_customer_id,
        defaultPaymentMethodId: data.default_payment_method_id,
    }}
}

export async function getPaymentMethods() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };
    const { userId } = session;

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('billing_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data || !data.stripe_customer_id) return { data: [] as CardSummary[] };

    const methods = await getStripeServer().paymentMethods.list({ customer: data.stripe_customer_id });
    return { data: methods.data.map((pm): CardSummary => ({
        id:              pm.id,
        brand:           pm.card!.brand,
        last4:           pm.card!.last4,
        expMonth:        pm.card!.exp_month,
        expYear:         pm.card!.exp_year,
        isDefault:       pm.id === data.default_payment_method_id,
    }))};
}
