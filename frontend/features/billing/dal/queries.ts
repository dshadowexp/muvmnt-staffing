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

export async function payrollAccountMeetsOnboardingRequirements(userId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("payroll_accounts")
        .select("charges_enabled, details_submitted, payouts_enabled")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        return { ok: false as const, message: error.message };
    }
    if (!data) {
        return {
            ok: false as const,
            message: "Complete payroll setup before continuing.",
        };
    }
    if (
        data.charges_enabled !== true ||
        data.details_submitted !== true ||
        data.payouts_enabled !== true
    ) {
        return {
            ok: false as const,
            message:
                "Payroll account must have charges, payouts, and details fully enabled before continuing.",
        };
    }
    return { ok: true as const };
}

export async function retrieveConnectedAccount() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };
    const { userId } = session;

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('payroll_accounts')
        .select('*')
        .eq('user_id', userId) 
        .single();
    if (error) return { error: error.message };
    if (!data) return { error: null, data: null };

    const account = await getStripeServer().accounts.retrieve(data.stripe_account_id);
    return { data: {
        accountId: data.stripe_account_id,
        enabled: account.charges_enabled && account.payouts_enabled,
        completed: account.details_submitted,
    }};
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
    console.log("data", data);
    console.log("error", error);

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
