import { getSession } from "@/lib/get-session";
import { getStripeServer } from "@/services/stripe/server";
import { createAdminClient } from "@/supabase/server";
import type { Json } from "@/supabase/types/database";
import { resolveFacilityIdForBillingSession } from "@/features/billing/dal/payment-methods";

export interface CardSummary {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
}

export async function getBillingAccount() {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { error: "No facility in session" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data) return { error: null, data: null };

    return {
        data: {
            customerId: data.stripe_customer_id,
        },
    };
}

export async function hasPaymentMethod() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };

    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { data: false };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data || !data.stripe_customer_id) return { data: false };

    const methods = await getStripeServer().paymentMethods.list({
        customer: data.stripe_customer_id,
    });
    return { data: methods.data.length > 0 };
}

export async function getPaymentMethods() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };

    const facilityId = await resolveFacilityIdForBillingSession();
    if (!facilityId) return { error: "No facility in session" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("facility_id", facilityId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data || !data.stripe_customer_id) return { data: [] as CardSummary[] };

    const methods = await getStripeServer().paymentMethods.list({
        customer: data.stripe_customer_id,
    });
    return { data: methods.data };
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

    if (!session.facilityId) return [];

    const { data: requests } = await supabase
        .from("staff_requests")
        .select("id")
        .eq("facility_id", session.facilityId);
    if (!requests || requests.length === 0) return [];

    const requestIds = requests.map((r) => r.id);

    const { data, error } = await supabase
        .from("payments")
        .select("id, amount_cents, currency, status, created_at")
        .in("request_id", requestIds)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as ClientPaymentRow[];
}
