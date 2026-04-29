import "server-only";

import { tasks } from "@trigger.dev/sdk/v3";

import type { payoutShiftTask } from "@/trigger/shifts";

import {
    SHIFT_STATUS_CHECKED_OUT,
    SHIFT_STATUS_COMPLETED,
    normalizeShiftStatus,
} from "../constants";
import { getShiftWithStaffRequest } from "../dal/queries";
import { patchShiftById } from "../dal/mutations";

export type ClientShiftActionResult =
    | { ok: true }
    | { ok: false; message: string };

/**
 * Client confirms the worker delivered the shift after checkout.
 *
 * Atomicity model: we mark the shift `completed` first, then enqueue the
 * payout task. If queueing fails the status is rolled back so the client can
 * retry — this prevents an "invisible" completed shift that never paid out.
 */
export async function completeClientShift(
    facilityId: string,
    clientUserId: string,
    shiftId: string,
): Promise<ClientShiftActionResult> {
    const row = await getShiftWithStaffRequest(shiftId);
    if (!row) return { ok: false, message: "Shift not found" };

    const sr = row.staff_requests;
    if (!sr || sr.facility_id !== facilityId) {
        return { ok: false, message: "Shift not found" };
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_CHECKED_OUT) {
        return {
            ok: false,
            message: "Only checked-out shifts can be marked complete",
        };
    }

    const now = new Date().toISOString();
    const completed = await patchShiftById(shiftId, {
        status: SHIFT_STATUS_COMPLETED,
        complete_time: now,
    });
    if (!completed.ok) return completed;

    try {
        await tasks.trigger<typeof payoutShiftTask>(
            "shifts.payout",
            { shiftId },
            {
                tags: [`shift:${shiftId}`],
                idempotencyKey: `shift-payout:${shiftId}`,
            },
        );
    } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to queue payout";
        await patchShiftById(shiftId, {
            status: SHIFT_STATUS_CHECKED_OUT,
            complete_time: null,
        });
        return { ok: false, message };
    }

    return { ok: true };
}
