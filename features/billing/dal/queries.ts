import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

export type BillingPeriodRow = Database["public"]["Tables"]["billing_periods"]["Row"];
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

export type FacilityBillingConfig = {
  id: string;
  name: string;
  billing_mode: string;
  net_terms_days: number;
  approval_window_hours: number;
  stripe_customer_id: string | null;
};

/** @deprecated Use FacilityBillingConfig */
export type ClientBillingConfig = FacilityBillingConfig;

export type BillableShift = {
  id: string;
  facility_id: string;
  worker_id: string | null;
  hourly_rate: number | null;
  checkin_time: string | null;
  checkout_time: string | null;
  start_time: string | null;
  end_time: string | null;
  timesheet_status: string | null;
  workers: { first_name: string; last_name: string } | null;
};

export type ShiftForAutoApprove = {
  id: string;
  facility_id: string;
  timesheet_status: string | null;
  facilities: { approval_window_hours: number } | null;
};

// ─── Facilities ───────────────────────────────────────────────────────────────

/** All facility IDs that have at least one completed shift in the given period. */
export async function getFacilityIdsWithCompletedShiftsInPeriod(
  periodStart: string,
  periodEnd: string,
): Promise<string[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("facility_id")
    .eq("status", "completed")
    .gte("start_time", periodStart)
    .lte("start_time", periodEnd);

  if (error) throw new Error(error.message);

  const unique = [...new Set((data ?? []).map((r) => r.facility_id))];
  return unique;
}

/** @deprecated Use getFacilityIdsWithCompletedShiftsInPeriod */
export const getClientIdsWithCompletedShiftsInPeriod =
  getFacilityIdsWithCompletedShiftsInPeriod;

/** Billing config for a single facility. */
export async function getFacilityBillingConfig(
  facilityId: string,
): Promise<FacilityBillingConfig | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("id, name, billing_mode, net_terms_days, approval_window_hours, stripe_customer_id")
    .eq("id", facilityId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data ?? null) as FacilityBillingConfig | null;
}

/** @deprecated Use getFacilityBillingConfig */
export const getClientBillingConfig = getFacilityBillingConfig;

/**
 * Resolve the Stripe customer ID for a facility.
 * Checks facilities.stripe_customer_id first, then falls back to
 * billing_accounts via the facility owner's user_id.
 */
export async function resolveStripeCustomerId(
  facilityId: string,
  directCustomerId: string | null,
): Promise<string | null> {
  if (directCustomerId) return directCustomerId;

  const supabase = await createAdminClient();

  // Fall back: find the owner's billing_account
  const { data: owner } = await supabase
    .from("operators")
    .select("user_id")
    .eq("facility_id", facilityId)
    .eq("permission", "owner")
    .maybeSingle();

  if (!owner) return null;

  const { data, error } = await supabase
    .from("billing_accounts")
    .select("stripe_customer_id")
    .eq("user_id", owner.user_id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data?.stripe_customer_id ?? null;
}

// ─── Billing periods ──────────────────────────────────────────────────────────

/** Find a billing period by its primary key. */
export async function getBillingPeriodById(
  billingPeriodId: string,
): Promise<BillingPeriodRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("billing_periods")
    .select("*")
    .eq("id", billingPeriodId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

/** Find an existing billing period for a client + period_start. */
export async function getBillingPeriod(
  facilityId: string,
  periodStart: string,
): Promise<BillingPeriodRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("billing_periods")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

/** All billing periods with status "pending_invoice" (closed, awaiting Stripe invoice). */
export async function getPendingInvoicePeriods(): Promise<BillingPeriodRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("billing_periods")
    .select("*")
    .eq("status", "pending_invoice");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

/**
 * All "submitted" shifts for a client within a period that can still be auto-approved
 * at close time (billing_period_id not yet assigned).
 */
export async function getSubmittedShiftsForClientInPeriod(
  facilityId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ id: string }[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("status", "completed")
    .eq("timesheet_status", "submitted")
    .is("billing_period_id", null)
    .gte("start_time", periodStart)
    .lte("start_time", periodEnd);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * All approved/auto_approved shifts for a client within a period
 * that haven't been assigned to a billing period yet.
 */
export async function getApprovedShiftsForClientInPeriod(
  facilityId: string,
  periodStart: string,
  periodEnd: string,
): Promise<BillableShift[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "id, facility_id, worker_id, hourly_rate, checkin_time, checkout_time, start_time, end_time, timesheet_status, workers(first_name, last_name)",
    )
    .eq("facility_id", facilityId)
    .eq("status", "completed")
    .in("timesheet_status", ["approved", "auto_approved"])
    .is("billing_period_id", null)
    .gte("start_time", periodStart)
    .lte("start_time", periodEnd);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BillableShift[];
}

/**
 * All approved/auto_approved shifts assigned to a billing period.
 * Used by generate-client-invoice to build line items.
 */
export async function getShiftsForBillingPeriod(
  billingPeriodId: string,
): Promise<BillableShift[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "id, facility_id, worker_id, hourly_rate, checkin_time, checkout_time, start_time, end_time, timesheet_status, workers(first_name, last_name)",
    )
    .eq("billing_period_id", billingPeriodId)
    .in("timesheet_status", ["approved", "auto_approved"]);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BillableShift[];
}

/** Shift + client billing config for auto-approve task. */
export async function getShiftForAutoApprove(
  shiftId: string,
): Promise<ShiftForAutoApprove | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id, facility_id, timesheet_status, facilities(approval_window_hours)")
    .eq("id", shiftId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data ?? null) as unknown as ShiftForAutoApprove | null;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

/** Whether an invoice already exists for a billing period (idempotency check). */
export async function getInvoiceForBillingPeriod(
  billingPeriodId: string,
): Promise<InvoiceRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("billing_period_id", billingPeriodId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}
