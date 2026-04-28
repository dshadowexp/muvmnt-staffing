import { logger, schemaTask, wait } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import {
  getShiftForAutoApprove,
} from "@/features/billing/dal/queries";
import { autoApproveShiftTimesheet } from "@/features/billing/dal/mutations";

const payloadSchema = z.object({
  shiftId: z.string().min(1),
});

/**
 * Waits for the client's approval window, then auto-approves the timesheet
 * if the client hasn't acted on it.
 *
 * Flow:
 *  1. Load shift + client.approval_window_hours
 *  2. `wait.for({ hours })` — Trigger.dev checkpoints the task here
 *  3. Re-load the shift; if still "submitted" → mark "auto_approved"
 *  4. If the client approved or disputed in the meantime → no-op
 *
 * Triggered from `payout-shift.ts` immediately after a shift payout, so the
 * window starts from when the worker is paid (shift officially completed).
 */
export const autoApproveTimesheetTask = schemaTask({
  id: "billing.auto-approve-timesheet",
  schema: payloadSchema,
  // maxDuration must accommodate the full approval window + execution time.
  // 50 hours covers a 48-hour window with headroom; adjust if clients use longer windows.
  maxDuration: 180_000, // 50 hours in seconds
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
    factor: 2,
  },
  run: async (payload) => {
    const { shiftId } = payload;

    // ── 1. Load shift + approval window ──────────────────────────────────────
    const shift = await getShiftForAutoApprove(shiftId);

    if (!shift) {
      logger.warn("Shift not found for auto-approve, skipping", { shiftId });
      return { skipped: true, reason: "shift_not_found" };
    }

    if (shift.timesheet_status !== "submitted") {
      // Already approved, disputed, or never submitted — nothing to do
      logger.log("Timesheet not in submitted state, skipping auto-approve", {
        shiftId,
        timesheetStatus: shift.timesheet_status,
      });
      return { skipped: true, reason: "not_submitted", status: shift.timesheet_status };
    }

    const approvalWindowHours = shift.facilities?.approval_window_hours ?? 48;
    logger.log("Waiting for facility approval window", { shiftId, approvalWindowHours });

    // ── 2. Wait for the approval window (Trigger.dev checkpoint) ─────────────
    await wait.for({ hours: approvalWindowHours });

    // ── 3. Re-check — client may have approved or disputed during the wait ────
    const refreshed = await getShiftForAutoApprove(shiftId);

    if (refreshed?.timesheet_status !== "submitted") {
      logger.log("Timesheet was manually reviewed during approval window", {
        shiftId,
        finalStatus: refreshed?.timesheet_status,
      });
      return {
        autoApproved: false,
        finalStatus: refreshed?.timesheet_status ?? "unknown",
      };
    }

    // ── 4. Auto-approve ───────────────────────────────────────────────────────
    await autoApproveShiftTimesheet(shiftId);

    logger.log("Timesheet auto-approved", { shiftId });

    return { autoApproved: true, shiftId };
  },
});
