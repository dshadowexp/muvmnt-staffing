import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";

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

    return { data: {
        accountId: data.stripe_account_id,
        enabled: data.charges_enabled && data.payouts_enabled,
        completed: data.details_submitted,
    }};
}