import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { getStripeServer } from "@/services/stripe/server";
import {
  getFacilityBillingConfig,
  getBillingPeriodById,
  getInvoiceForBillingPeriod,
  getShiftsForBillingPeriod,
  resolveStripeCustomerId,
} from "@/features/billing/dal/queries";
import {
  backfillFacilityStripeCustomerId,
  insertInvoiceRecord,
  markBillingPeriodInvoiced,
} from "@/features/billing/dal/mutations";

const payloadSchema = z.object({
  billingPeriodId: z.string().min(1),
  facilityId: z.string().min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute billable hours from a shift's actual checkin/checkout (or scheduled times). */
function billableHours(shift: {
  checkin_time: string | null;
  checkout_time: string | null;
  start_time: string | null;
  end_time: string | null;
}): number {
  const start = shift.checkin_time ?? shift.start_time;
  const end = shift.checkout_time ?? shift.end_time;
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD
}

// ─── Task ─────────────────────────────────────────────────────────────────────

/**
 * Creates and sends (or auto-charges) a Stripe invoice for one billing period.
 *
 * Idempotency layers:
 *  1. DB check: if an invoice row already exists for this billing_period_id, skip.
 *  2. Stripe idempotency key `inv_create_<billingPeriodId>`: Stripe returns the
 *     same invoice object on retries so we never create duplicates.
 *  3. DB insert: unique constraint on (client_id, billing_period_id) catches any
 *     race that slips through layers 1 and 2.
 */
export const generateClientInvoiceTask = schemaTask({
  id: "billing.generate-client-invoice",
  schema: payloadSchema,
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload) => {
    const { billingPeriodId, facilityId } = payload;

    logger.log("Generating client invoice", { billingPeriodId, facilityId });

    // ── 1. Idempotency: skip if already invoiced ──────────────────────────────
    const existing = await getInvoiceForBillingPeriod(billingPeriodId);
    if (existing) {
      logger.log("Invoice already exists, skipping", {
        billingPeriodId,
        stripeInvoiceId: existing.stripe_invoice_id,
      });
      return { skipped: true, invoiceId: existing.id };
    }

    // ── 2. Load billing period + facility config in parallel ──────────────────
    const [period, facility] = await Promise.all([
      getBillingPeriodById(billingPeriodId),
      getFacilityBillingConfig(facilityId),
    ]);

    if (!period) {
      throw new Error(`Billing period not found: ${billingPeriodId}`);
    }

    const periodStart = period.period_start;
    const periodEnd = period.period_end;
    if (!facility) {
      throw new Error(`Facility not found: ${facilityId}`);
    }

    // ── 3. Resolve Stripe customer ────────────────────────────────────────────
    let stripeCustomerId = await resolveStripeCustomerId(
      facilityId,
      facility.stripe_customer_id,
    );

    if (!stripeCustomerId) {
      logger.error("No Stripe customer ID found for facility — invoice skipped", { facilityId });
      return { skipped: true, reason: "no_stripe_customer" };
    }

    // Backfill facilities.stripe_customer_id if we resolved it from billing_accounts
    if (!facility.stripe_customer_id) {
      await backfillFacilityStripeCustomerId(facilityId, stripeCustomerId);
    }

    // ── 4. Load approved shifts ───────────────────────────────────────────────
    const shifts = await getShiftsForBillingPeriod(billingPeriodId);

    if (shifts.length === 0) {
      logger.warn("No approved shifts for billing period — marking invoiced with zero amount", {
        billingPeriodId,
      });
      await markBillingPeriodInvoiced(billingPeriodId);
      return { skipped: true, reason: "no_shifts" };
    }

    // ── 5. Create Stripe invoice (draft, no auto_advance yet) ─────────────────
    const stripe = getStripeServer();
    const collectionMethod =
      facility.billing_mode === "auto_charge" ? "charge_automatically" : "send_invoice";

    const invoice = await stripe.invoices.create(
      {
        customer: stripeCustomerId,
        collection_method: collectionMethod,
        ...(collectionMethod === "send_invoice"
          ? { days_until_due: facility.net_terms_days }
          : {}),
        currency: "cad",
        auto_advance: false, // We finalise manually after adding all items
        metadata: {
          billing_period_id: billingPeriodId,
          facility_id: facilityId,
        },
      },
      { idempotencyKey: `inv_create_${billingPeriodId}` },
    );

    logger.log("Stripe invoice created (draft)", { stripeInvoiceId: invoice.id });

    // ── 6. Add line items ─────────────────────────────────────────────────────
    let totalAmountCents = 0;

    for (const shift of shifts) {
      const hours = billableHours(shift);
      if (hours <= 0 || !shift.hourly_rate) {
        logger.warn("Skipping shift with no billable hours or rate", { shiftId: shift.id });
        continue;
      }

      const amountCents = Math.round(hours * shift.hourly_rate * 100);
      const workerName = shift.workers
        ? `${shift.workers.first_name} ${shift.workers.last_name}`
        : "Staff";
      const dateStr = formatDate(shift.checkin_time ?? shift.start_time ?? "");
      const description = `${workerName} – ${dateStr} (${hours.toFixed(2)}h @ $${shift.hourly_rate}/h)`;

      await stripe.invoiceItems.create(
        {
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: amountCents,
          currency: "cad",
          description,
        },
        { idempotencyKey: `inv_item_${shift.id}_${billingPeriodId}` },
      );

      totalAmountCents += amountCents;
    }

    logger.log("Invoice line items added", {
      shiftCount: shifts.length,
      totalAmountCents,
    });

    // ── 7. Finalize (locks the invoice; auto-charges for charge_automatically) ─
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id, {
      auto_advance: true,
    });

    // ── 8. Send for net-terms invoices ────────────────────────────────────────
    if (collectionMethod === "send_invoice") {
      await stripe.invoices.sendInvoice(finalized.id);
      logger.log("Invoice sent to customer", { stripeInvoiceId: finalized.id });
    }

    // ── 9. Persist invoice record ─────────────────────────────────────────────
    const dueDate =
      finalized.due_date != null ? new Date(finalized.due_date * 1000).toISOString() : null;

    // `facility_id` replaces `client_id` post-migration; cast until DB types are regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await insertInvoiceRecord({
      billing_period_id: billingPeriodId,
      facility_id: facilityId,
      stripe_invoice_id: finalized.id,
      stripe_customer_id: stripeCustomerId,
      period_start: periodStart,
      period_end: periodEnd,
      total_amount_cents: totalAmountCents,
      currency: "cad",
      collection_method: collectionMethod,
      due_date: dueDate,
      status: finalized.status ?? "open",
    } as any);

    // ── 10. Mark billing period as invoiced ───────────────────────────────────
    await markBillingPeriodInvoiced(billingPeriodId);

    logger.log("Invoice generation complete", {
      billingPeriodId,
      stripeInvoiceId: finalized.id,
      totalAmountCents,
      collectionMethod,
    });

    return {
      billingPeriodId,
      stripeInvoiceId: finalized.id,
      totalAmountCents,
      shiftCount: shifts.length,
    };
  },
});
