import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { processShiftPayoutJob } from "@/features/shifts/server/payout";
import { submitShiftTimesheet } from "@/features/billing/dal/mutations";
import { autoApproveTimesheetTask } from "@/trigger/billing/auto-approve-timesheet";

export const payoutShiftPayloadSchema = z.object({
    shiftId: z.string().min(1),
});
export type PayoutShiftPayload = z.infer<typeof payoutShiftPayloadSchema>;

/**
 * Pay a worker for a completed shift via Stripe Connect transfer.
 *
 * Safety:
 *  - {@link processShiftPayoutJob} writes a `transfers` row keyed on `shift_id`
 *    so retries (or manual re-runs) never double-pay.
 *  - If the shift isn't in `completed` (rare race), the job no-ops.
 *
 * Retries reserve themselves for Stripe / DB transient errors. The job throws
 * only when an outbound call genuinely fails so trigger.dev's exponential
 * backoff smooths over short blips without a thundering herd.
 */
export const payoutShiftTask = task({
    id: "shifts.payout",
    maxDuration: 180,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 5_000,
        maxTimeoutInMs: 120_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: PayoutShiftPayload) => {
        const payload = payoutShiftPayloadSchema.parse(raw);
        logger.log("Processing shift payout", { shiftId: payload.shiftId });
        await processShiftPayoutJob(payload.shiftId);

        // Mark timesheet as submitted and start the client-approval countdown.
        // submitShiftTimesheet is a no-op if already set (idempotent on null → submitted).
        await submitShiftTimesheet(payload.shiftId);
        await autoApproveTimesheetTask.trigger({ shiftId: payload.shiftId });

        logger.log("Timesheet submitted, auto-approve task triggered", { shiftId: payload.shiftId });

        return { shiftId: payload.shiftId };
    },
});
