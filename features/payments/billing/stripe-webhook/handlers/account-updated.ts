import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/services/supabase/server";

/**
 * Reconcile a Stripe Connect account with our `payroll_accounts` table.
 *
 * Keeps the DB in sync with Stripe capability changes (charges/payouts
 * enabled, onboarding completion) so the app reflects the latest account
 * state without polling Stripe.
 */
export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const stripeAccountId = account.id;
    const userId = account.metadata?.user_id ?? account.metadata?.userId;

    const supabase = await createAdminClient();
    const updatePayload = {
        stripe_account_id: stripeAccountId,
        payouts_enabled: account.payouts_enabled ?? false,
        charges_enabled: account.charges_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
    } as const;

    const byAccount = await supabase
        .from("payroll_accounts")
        .update(updatePayload)
        .eq("stripe_account_id", stripeAccountId)
        .select("id");

    if (byAccount.error) throw byAccount.error;
    if (byAccount.data?.length) return;

    if (!userId) {
        console.error(`account.updated for ${stripeAccountId} has no metadata.user_id; cannot reconcile payroll_accounts`);
        return;
    }

    const byUser = await supabase
        .from("payroll_accounts")
        .update(updatePayload)
        .eq("user_id", userId)
        .select("id");

    if (byUser.error) throw byUser.error;
    if (byUser.data?.length) return;

    const insert = await supabase.from("payroll_accounts").insert({
        user_id: userId,
        ...updatePayload,
    });

    if (insert.error) throw insert.error;
}
