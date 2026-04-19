import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import {
    processShiftTransferJob,
    restoreStuckReassigningShift,
} from "@/features/shifts/server/reassignment";

export const transferShiftPayloadSchema = z.object({
    shiftId: z.string().min(1),
    excludeWorkerUserId: z.string().min(1),
    /** Status to restore if no replacement matches (e.g. `confirmed`). */
    previousStatus: z.string().min(1),
});
export type TransferShiftPayload = z.infer<typeof transferShiftPayloadSchema>;

const MAX_ATTEMPTS = 3;

/**
 * Find a replacement worker for a shift the original holder is leaving.
 *
 * Idempotency:
 *  - Caller scopes the trigger with `idempotencyKey: shift-transfer:{shiftId}`
 *    so a double-click collapses to one run.
 *  - {@link processShiftTransferJob} bails out cleanly if the shift isn't in
 *    `reassigning`, which also makes manual re-runs safe.
 *
 * Failure handling:
 *  - The job function itself swallows matcher failures and self-restores the
 *    shift status, so retries here are reserved for transient infra issues
 *    (DB hiccup, Stripe blip). When the final attempt still throws we restore
 *    the previous status so the shift never stays stranded in `reassigning`.
 */
export const transferShiftTask = task({
    id: "shifts.transfer",
    maxDuration: 120,
    retry: {
        maxAttempts: MAX_ATTEMPTS,
        minTimeoutInMs: 2_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: TransferShiftPayload, { ctx }) => {
        const payload = transferShiftPayloadSchema.parse(raw);
        logger.log("Processing shift transfer", {
            shiftId: payload.shiftId,
            attempt: ctx.attempt.number,
        });
        try {
            await processShiftTransferJob(payload);
            return { shiftId: payload.shiftId };
        } catch (err) {
            if (ctx.attempt.number >= MAX_ATTEMPTS) {
                await restoreStuckReassigningShift(
                    payload.shiftId,
                    payload.previousStatus,
                ).catch((restoreErr) =>
                    logger.error(
                        "shift.transfer: failed to restore previous status",
                        {
                            shiftId: payload.shiftId,
                            err:
                                restoreErr instanceof Error
                                    ? restoreErr.message
                                    : String(restoreErr),
                        },
                    ),
                );
            }
            throw err;
        }
    },
});
