import { getSession } from "@/lib/get-session";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { getStripeServer } from "@/services/stripe/server";
import { createAdminClient } from "@/services/supabase/server";
import type { Json } from "@/services/supabase/types/database";

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

export type ClientPaymentRow = {
  id: string;
  amount_cents: number | null;
  currency: string;
  status: string;
  created_at: string;
  payment_method: Json;
};

export async function getSuccessfulPaymentsForClient(): Promise<ClientPaymentRow[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = await createAdminClient();

  const { data: requests } = await supabase
    .from("staff_requests")
    .select("id")
    .eq("client_id", session.userId);
  if (!requests || requests.length === 0) return [];

  const requestIds = requests.map((r) => r.id);

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount_cents, currency, status, created_at, payment_method")
    .in("request_id", requestIds)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ClientPaymentRow[];
}
