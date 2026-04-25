import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

// ─── Billing periods ──────────────────────────────────────────────────────────

/**
 * Insert a new billing period, ignoring conflicts (UNIQUE on client_id, period_start).
 * Always returns the canonical id for that client+period_start pair.
 */
export async function upsertBillingPeriod(
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<string> {
  const supabase = await createAdminClient();

  // Insert (ignore duplicate — period may already exist from a prior close run)
  await supabase
    .from("billing_periods")
    .insert({
      client_id: clientId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "open",
    })
    .select("id")
    .maybeSingle();

  // Always fetch the canonical row regardless of whether we inserted it
  const { data, error } = await supabase
    .from("billing_periods")
    .select("id")
    .eq("client_id", clientId)
    .eq("period_start", periodStart)
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/** Mark a billing period as "pending_invoice" — ready for invoice generation on Tuesday. */
export async function closeBillingPeriod(periodId: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("billing_periods")
    .update({ status: "pending_invoice", updated_at: new Date().toISOString() })
    .eq("id", periodId);

  if (error) throw new Error(error.message);
}

/** Mark a billing period as "invoiced" after the Stripe invoice has been created and sent. */
export async function markBillingPeriodInvoiced(periodId: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("billing_periods")
    .update({ status: "invoiced", updated_at: new Date().toISOString() })
    .eq("id", periodId);

  if (error) throw new Error(error.message);
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

/**
 * Bulk auto-approve all "submitted" timesheets for a list of shift ids.
 * The `.eq("timesheet_status", "submitted")` guard ensures manual
 * approvals or disputes that happened between query and update are not overwritten.
 */
export async function bulkAutoApproveTimesheets(shiftIds: string[]): Promise<void> {
  if (shiftIds.length === 0) return;
  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("shifts")
    .update({
      timesheet_status: "auto_approved",
      approved_at: now,
      updated_at: now,
    })
    .in("id", shiftIds)
    .eq("timesheet_status", "submitted");

  if (error) throw new Error(error.message);
}

/**
 * Single-shift auto-approve — used by the delay-based auto-approve-timesheet task.
 * Only updates if the timesheet is still "submitted" (not already reviewed).
 */
export async function autoApproveShiftTimesheet(shiftId: string): Promise<void> {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("shifts")
    .update({
      timesheet_status: "auto_approved",
      approved_at: now,
      updated_at: now,
    })
    .eq("id", shiftId)
    .eq("timesheet_status", "submitted");

  if (error) throw new Error(error.message);
}

/**
 * Mark a shift's timesheet as "submitted" — called when the shift payout is
 * processed and the timesheet is ready for client review.
 */
export async function submitShiftTimesheet(shiftId: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      timesheet_status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shiftId)
    .is("timesheet_status", null); // only if not already set (idempotent)

  if (error) throw new Error(error.message);
}

/** Assign a batch of shifts to a billing period. */
export async function assignShiftsToBillingPeriod(
  shiftIds: string[],
  billingPeriodId: string,
): Promise<void> {
  if (shiftIds.length === 0) return;
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      billing_period_id: billingPeriodId,
      updated_at: new Date().toISOString(),
    })
    .in("id", shiftIds);

  if (error) throw new Error(error.message);
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

/**
 * Insert an invoice record. Silently ignores UNIQUE violations on
 * (client_id, billing_period_id) — the Stripe-side idempotency key handles
 * dedup at the source; this just keeps the DB consistent on retries.
 */
export async function insertInvoiceRecord(data: InvoiceInsert): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("invoices").insert(data);

  // 23505 = unique_violation — invoice already exists, nothing to do
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

/** Update invoice status when a Stripe webhook fires (payment_succeeded / payment_failed). */
export async function updateInvoiceStatusByStripeId(
  stripeInvoiceId: string,
  status: string,
): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("stripe_invoice_id", stripeInvoiceId);

  if (error) throw new Error(error.message);
}

/**
 * Backfill `clients.stripe_customer_id` when we resolve it from `billing_accounts`.
 * Saves a join on future invoice runs.
 */
export async function backfillClientStripeCustomerId(
  clientId: string,
  stripeCustomerId: string,
): Promise<void> {
  const supabase = await createAdminClient();
  await supabase
    .from("clients")
    .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .is("stripe_customer_id", null); // only if not already set
}
