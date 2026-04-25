import { logger, schedules } from "@trigger.dev/sdk/v3";

import { getPendingInvoicePeriods } from "@/features/billing/dal/queries";
import { generateClientInvoiceTask } from "./generate-client-invoice";

/**
 * Runs every Tuesday at 06:00 UTC. Picks up every billing period that was
 * closed on Sunday and fans out one `generate-client-invoice` child task per
 * period.
 *
 * The two-day gap (Sunday close → Tuesday invoice) gives clients and staff
 * until Monday evening to raise and resolve any disputes before the invoice
 * goes out.
 *
 * Idempotency: `generate-client-invoice` checks for an existing invoice row
 * before touching Stripe, so re-running this task is safe.
 */
export const generateInvoicesTask = schedules.task({
  id: "billing.generate-invoices",
  cron: "0 6 * * 2", // Tuesday 06:00 UTC
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Starting invoice generation run", { timestamp: payload.timestamp });

    const pendingPeriods = await getPendingInvoicePeriods();

    logger.log("Pending billing periods to invoice", { count: pendingPeriods.length });

    if (pendingPeriods.length === 0) {
      return { invoiced: 0 };
    }

    // Fan out — one child task per billing period
    await generateClientInvoiceTask.batchTrigger(
      pendingPeriods.map((period) => ({
        payload: {
          billingPeriodId: period.id,
          clientId: period.client_id,
        },
      })),
    );

    logger.log("Triggered generate-client-invoice tasks", { count: pendingPeriods.length });

    return { invoiced: pendingPeriods.length };
  },
});
