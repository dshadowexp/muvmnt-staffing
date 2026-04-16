"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";
import { STAFF_REQUEST_STATUS_CONFIRMED } from "../constants";
import { cardDisplayFromPaymentMethodJson } from "../lib/payment-method-card-display";

export async function getStaffRequest(id: string) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        return { error: true, message: error.message };
    }

    return { error: false, data: data };
}

export type StaffRequestSiteAndPayments = {
  location: {
    address: string;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    admin_area: string | null;
    postal_code: string | null;
    country_code: string | null;
  } | null;
  payments: {
    id: string;
    amount_cents: number | null;
    currency: string;
    status: string;
    created_at: string;
    card_display: string | null;
  }[];
};

export async function getStaffRequestSiteAndPayments(requestId: string) {
  const { user } = await getCurrentUser({ allData: true });
  if (user == null) {
    return { error: true as const, message: "User not authenticated" };
  }

  const supabase = await createAdminClient();
  const { data: sr, error: srError } = await supabase
    .from("staff_requests")
    .select("client_id, cell_id")
    .eq("id", requestId)
    .single();

  if (srError || sr == null) {
    return { error: true as const, message: srError?.message ?? "Not found" };
  }
  if (sr.client_id !== user.id) {
    return { error: true as const, message: "Not found" };
  }

  const [locRes, payRes] = await Promise.all([
    supabase
      .from("locations")
      .select(
        "address, address_line_1, address_line_2, city, admin_area, postal_code, country_code",
      )
      .eq("user_id", sr.client_id)
      .eq("cell_id", sr.cell_id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount_cents, currency, status, created_at, payment_method")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
  ]);

  if (locRes.error) {
    return { error: true as const, message: locRes.error.message };
  }
  if (payRes.error) {
    return { error: true as const, message: payRes.error.message };
  }

  const payments: StaffRequestSiteAndPayments["payments"] = (payRes.data ?? []).map(
    (row) => ({
      id: row.id,
      amount_cents: row.amount_cents,
      currency: row.currency,
      status: row.status,
      created_at: row.created_at,
      card_display: cardDisplayFromPaymentMethodJson(row.payment_method),
    }),
  );

  const data: StaffRequestSiteAndPayments = {
    location: locRes.data,
    payments,
  };
  return { error: false as const, data };
}

export async function getJobInfos() {
    const { user } = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("client_id", user.id)
        .eq("status", STAFF_REQUEST_STATUS_CONFIRMED)
        .order("created_at", { ascending: false });

    if (error) {
        return { error: true, message: error.message };
    }

    return { error: false, data: data };
}
