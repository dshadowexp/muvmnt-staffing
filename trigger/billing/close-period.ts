import { logger, schedules } from "@trigger.dev/sdk/v3";

import {
  getClientIdsWithCompletedShiftsInPeriod,
  getSubmittedShiftsForClientInPeriod,
  getApprovedShiftsForClientInPeriod,
} from "@/features/billing/dal/queries";
import {
  bulkAutoApproveTimesheets,
  upsertBillingPeriod,
  assignShiftsToBillingPeriod,
  closeBillingPeriod,
} from "@/features/billing/dal/mutations";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given any date, return the Monday 00:00:00 UTC and Sunday 23:59:59.999 UTC
 * bounding the ISO week that contains that date.
 */
function getWeekBoundaries(date: Date): { periodStart: Date; periodEnd: Date } {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { periodStart: monday, periodEnd: sunday };
}

// ─── Task ─────────────────────────────────────────────────────────────────────

/**
 * Runs every Sunday at 23:59 UTC. Closes the billing period for every client
 * that had completed shifts this week:
 *
 *  1. Auto-approve any "submitted" timesheets that were not manually reviewed
 *     (override the per-client window so nothing slips out of the invoice).
 *  2. Collect all approved / auto_approved shifts not yet assigned to a period.
 *  3. Upsert a billing_period row and assign the shifts to it.
 *  4. Mark the period "pending_invoice" — Tuesday's generate-invoices task picks it up.
 *
 * Idempotency: `upsertBillingPeriod` ignores duplicate inserts, and
 * `assignShiftsToBillingPeriod` is an idempotent update, so re-runs are safe.
 */
export const closeBillingPeriodTask = schedules.task({
  id: "billing.close-period",
  cron: "59 23 * * 0", // Sunday 23:59 UTC
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
    factor: 2,
  },
  run: async (payload) => {
    const runAt = payload.timestamp;
    const { periodStart, periodEnd } = getWeekBoundaries(runAt);

    const periodStartIso = periodStart.toISOString();
    const periodEndIso = periodEnd.toISOString();

    logger.log("Closing billing period", { periodStart: periodStartIso, periodEnd: periodEndIso });

    // Find clients that have activity this week
    const clientIds = await getClientIdsWithCompletedShiftsInPeriod(
      periodStartIso,
      periodEndIso,
    );

    logger.log("Clients with activity this period", { count: clientIds.length });

    const summary = {
      clients: clientIds.length,
      autoApproved: 0,
      shiftsAssigned: 0,
      periodsCreated: 0,
    };

    for (const clientId of clientIds) {
      try {
        // 1. Auto-approve any remaining "submitted" timesheets
        const submittedShifts = await getSubmittedShiftsForClientInPeriod(
          clientId,
          periodStartIso,
          periodEndIso,
        );

        if (submittedShifts.length > 0) {
          const ids = submittedShifts.map((s) => s.id);
          await bulkAutoApproveTimesheets(ids);
          summary.autoApproved += ids.length;
          logger.log("Auto-approved timesheets at period close", { clientId, count: ids.length });
        }

        // 2. Collect all approved / auto_approved shifts not yet in a period
        const approvedShifts = await getApprovedShiftsForClientInPeriod(
          clientId,
          periodStartIso,
          periodEndIso,
        );

        if (approvedShifts.length === 0) {
          logger.log("No billable shifts for client, skipping period creation", { clientId });
          continue;
        }

        // 3. Upsert billing period and assign shifts
        const periodId = await upsertBillingPeriod(clientId, periodStartIso, periodEndIso);
        await assignShiftsToBillingPeriod(
          approvedShifts.map((s) => s.id),
          periodId,
        );

        // 4. Close the period
        await closeBillingPeriod(periodId);

        summary.shiftsAssigned += approvedShifts.length;
        summary.periodsCreated += 1;

        logger.log("Billing period closed", {
          clientId,
          periodId,
          shiftCount: approvedShifts.length,
        });
      } catch (err) {
        // Non-fatal per client — log and continue so one bad client doesn't block the rest
        logger.error("Failed to close period for client", {
          clientId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.log("Billing period close complete", summary);
    return summary;
  },
});
