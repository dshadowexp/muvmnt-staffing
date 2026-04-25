import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

export type BillingPeriodRow = Database["public"]["Tables"]["billing_periods"]["Row"];
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

export type ClientBillingConfig = {
  id: string;
  user_id: string;
  name: string;
  billing_mode: string;
  net_terms_days: number;
  approval_window_hours: number;
  stripe_customer_id: string | null;
};

export type BillableShift = {
  id: string;
  client_id: string;
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
  client_id: string;
  timesheet_status: string | null;
  clients: { approval_window_hours: number } | null;
};

// ─── Clients ──────────────────────────────────────────────────────────────────

/** All clients that have at least one completed shift in the given period. */
export async function getClientIdsWithCompletedShiftsInPeriod(
  periodStart: string,
  periodEnd: string,
): Promise<string[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("client_id")
    .eq("status", "completed")
    .gte("start_time", periodStart)
    .lte("start_time", periodEnd);

  if (error) throw new Error(error.message);

  const unique = [...new Set((data ?? []).map((r) => r.client_id))];
  return unique;
}

/** Billing config for a single client. */
export async function getClientBillingConfig(
  clientId: string,
): Promise<ClientBillingConfig | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, user_id, name, billing_mode, net_terms_days, approval_window_hours, stripe_customer_id")
    .eq("id", clientId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data ?? null) as ClientBillingConfig | null;
}

/**
 * Resolve the Stripe customer ID for a client.
 * First checks `clients.stripe_customer_id`, then falls back to `billing_accounts`
 * (linked via `clients.user_id`). Returns null if neither is set.
 */
export async function resolveStripeCustomerId(
  clientId: string,
  clientUserId: string,
  directCustomerId: string | null,
): Promise<string | null> {
  if (directCustomerId) return directCustomerId;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("billing_accounts")
    .select("stripe_customer_id")
    .eq("user_id", clientUserId)
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
  clientId: string,
  periodStart: string,
): Promise<BillingPeriodRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("billing_periods")
    .select("*")
    .eq("client_id", clientId)
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
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ id: string }[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id")
    .eq("client_id", clientId)
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
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<BillableShift[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "id, client_id, worker_id, hourly_rate, checkin_time, checkout_time, start_time, end_time, timesheet_status, workers(first_name, last_name)",
    )
    .eq("client_id", clientId)
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
      "id, client_id, worker_id, hourly_rate, checkin_time, checkout_time, start_time, end_time, timesheet_status, workers(first_name, last_name)",
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
    .select("id, client_id, timesheet_status, clients(approval_window_hours)")
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
