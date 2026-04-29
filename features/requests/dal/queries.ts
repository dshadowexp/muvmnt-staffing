"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { cardDisplayFromPaymentMethodJson } from "../lib/payment-method-card-display";
import { parseSiteRowFromStaffRequestLocation } from "../lib/staff-request-location-json";

export async function getStaffRequest(id: string) {
    const session = await getSession();
    if (!session) return { error: true, message: "User not authenticated" };
    if (!session.facilityId) return { error: true, message: "User not authenticated" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("id", id)
        .eq("facility_id", session.facilityId)
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
    instructions: string | null;
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
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (!session.facilityId) return { error: true, message: "User not authenticated" };

  const supabase = await createAdminClient();
  const { data: sr, error: srError } = await supabase
    .from("staff_requests")
    .select("facility_id, operator_id, cell_id, location")
    .eq("id", requestId)
    .eq("facility_id", session.facilityId)
    .single();

  if (srError || sr == null) {
    return { error: true as const, message: srError?.message ?? "Not found" };
  }

  const { data: opRow } = await supabase
    .from("operators")
    .select("user_id")
    .eq("id", sr.operator_id)
    .maybeSingle();
  const creatorUserId = opRow?.user_id ?? null;

  const fromRequest = parseSiteRowFromStaffRequestLocation(sr.location);
  if (fromRequest) {
    const { data: payResData, error: payErr } = await supabase
      .from("payments")
      .select("id, amount_cents, currency, status, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    if (payErr) {
      return { error: true as const, message: payErr.message };
    }
    const payments: StaffRequestSiteAndPayments["payments"] = (payResData ?? []).map(
      (row) => ({
        id: row.id,
        amount_cents: row.amount_cents,
        currency: row.currency,
        status: row.status,
        created_at: row.created_at,
        card_display: null
      }),
    );
    return {
      error: false as const,
      data: { location: fromRequest, payments },
    };
  }

  const [locRes, payRes] = await Promise.all([
    creatorUserId
      ? supabase
          .from("locations")
          .select(
            "address, address_line_1, address_line_2, city, admin_area, postal_code, country_code",
          )
          .eq("user_id", creatorUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("payments")
      .select("id, amount_cents, currency, status, created_at")
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
      card_display: null,
    }),
  );

  const loc = locRes.data
    ? {
        ...locRes.data,
        instructions: null as string | null,
      }
    : null;
  const data: StaffRequestSiteAndPayments = {
    location: loc,
    payments,
  };
  return { error: false as const, data };
}

export async function getStaffRequests() {
    const session = await getSession();
    if (!session) return { error: true, message: "User not authenticated" };
    if (!session.facilityId) return { error: true, message: "User not authenticated" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("facility_id", session.facilityId)
        .order("created_at", { ascending: false });

    if (error) {
        return { error: true, message: error.message };
    }

    return { error: false, data: data };
}
