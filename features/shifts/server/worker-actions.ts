import "server-only";

import { tasks } from "@trigger.dev/sdk/v3";

import { STAFF_REQUEST_PROFESSION_PLACEHOLDER } from "@/features/requests/constants";
import { findReplacementUserIdForShiftWindow } from "@/features/requests/server/matching";
import type { transferShiftTask } from "@/trigger/shifts";

import {
    SHIFT_STATUS_CANCELLED,
    SHIFT_STATUS_CHECKED_OUT,
    SHIFT_STATUS_CONFIRMED,
    SHIFT_STATUS_DECLINED,
    SHIFT_STATUS_IN_PROGRESS,
    SHIFT_STATUS_REASSIGNING,
    SHIFT_STATUS_SCHEDULED,
    normalizeShiftStatus,
} from "../constants";
import {
    getShiftWithStaffRequest,
    getWorkerIdByUserId,
} from "../dal/queries";
import { patchShiftById } from "../dal/mutations";
import { shiftWindowFromTimestamps } from "../lib/shift-time";

export type WorkerShiftActionResult =
    | { ok: true }
    | { ok: false; message: string };

export async function confirmWorkerShift(
    workerUserId: string,
    shiftId: string,
): Promise<WorkerShiftActionResult> {
    const workerId = await getWorkerIdByUserId(workerUserId);
    if (!workerId) return { ok: false, message: "Worker profile not found" };

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row || row.worker_id !== workerId) {
        return { ok: false, message: "Shift not found" };
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_SCHEDULED) {
        return {
            ok: false,
            message: "Only scheduled shifts can be confirmed",
        };
    }

    const now = new Date().toISOString();
    return patchShiftById(shiftId, {
        status: SHIFT_STATUS_CONFIRMED,
        confirm_time: now,
    });
}

/**
 * Worker decline: re-runs the matcher synchronously to swap in a replacement
 * (greedy, single-worker cover) when possible. If nothing matches, the shift
 * is left `declined` so the client surface can flag it.
 */
export async function declineWorkerShift(
    workerUserId: string,
    shiftId: string,
): Promise<WorkerShiftActionResult> {
    const workerId = await getWorkerIdByUserId(workerUserId);
    if (!workerId) return { ok: false, message: "Worker profile not found" };

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row || row.worker_id !== workerId) {
        return { ok: false, message: "Shift not found" };
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_SCHEDULED) {
        return {
            ok: false,
            message: "Only scheduled shifts can be declined",
        };
    }

    const sr = row.staff_requests;
    if (!sr?.pricing_tier) {
        return {
            ok: false,
            message: "Shift request has no pricing tier; cannot re-match",
        };
    }

    const win = shiftWindowFromTimestamps(row.start_time, row.end_time);
    if (!win) return { ok: false, message: "Shift has invalid times" };

    const replacementUserId = await findReplacementUserIdForShiftWindow({
        clientUserId: sr.client_id,
        dateYmd: win.dateYmd,
        startHHmm: win.startHHmm,
        endHHmm: win.endHHmm,
        pricingTierId: sr.pricing_tier,
        requestProfession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
        requirements: sr.requirements ?? [],
        excludeUserIds: [workerUserId],
    });

    if (replacementUserId) {
        const newWorkerId = await getWorkerIdByUserId(replacementUserId);
        if (!newWorkerId) {
            await patchShiftById(shiftId, { status: SHIFT_STATUS_DECLINED });
            return {
                ok: false,
                message: "Replacement could not be linked to a worker profile",
            };
        }
        return patchShiftById(shiftId, {
            worker_id: newWorkerId,
            status: SHIFT_STATUS_SCHEDULED,
        });
    }

    return patchShiftById(shiftId, { status: SHIFT_STATUS_DECLINED });
}

export async function checkInWorkerShift(
    workerUserId: string,
    shiftId: string,
): Promise<WorkerShiftActionResult> {
    const workerId = await getWorkerIdByUserId(workerUserId);
    if (!workerId) return { ok: false, message: "Worker profile not found" };

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row || row.worker_id !== workerId) {
        return { ok: false, message: "Shift not found" };
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_CONFIRMED) {
        return {
            ok: false,
            message: "Only confirmed shifts can be checked in",
        };
    }

    const now = new Date().toISOString();
    return patchShiftById(shiftId, {
        status: SHIFT_STATUS_IN_PROGRESS,
        checkin_time: now,
    });
}

export async function checkOutWorkerShift(
    workerUserId: string,
    shiftId: string,
): Promise<WorkerShiftActionResult> {
    const workerId = await getWorkerIdByUserId(workerUserId);
    if (!workerId) return { ok: false, message: "Worker profile not found" };

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row || row.worker_id !== workerId) {
        return { ok: false, message: "Shift not found" };
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_IN_PROGRESS) {
        return {
            ok: false,
            message: "Only in-progress shifts can be checked out",
        };
    }

    const now = new Date().toISOString();
    return patchShiftById(shiftId, {
        status: SHIFT_STATUS_CHECKED_OUT,
        checkout_time: now,
    });
}

/**
 * Mark the shift `reassigning` and queue a Trigger.dev task to find a
 * replacement asynchronously. If queueing fails, the previous status is
 * restored so the worker isn't stranded mid-transfer.
 */
export async function requestWorkerShiftTransfer(
    workerUserId: string,
    shiftId: string,
): Promise<WorkerShiftActionResult> {
    const workerId = await getWorkerIdByUserId(workerUserId);
    if (!workerId) return { ok: false, message: "Worker profile not found" };

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row || row.worker_id !== workerId) {
        return { ok: false, message: "Shift not found" };
    }

    const st = normalizeShiftStatus(row.status);
    if (st === SHIFT_STATUS_REASSIGNING) {
        return {
            ok: false,
            message: "A transfer is already in progress for this shift",
        };
    }
    if (st !== SHIFT_STATUS_CONFIRMED) {
        return {
            ok: false,
            message: "Only confirmed shifts can be transferred",
        };
    }

    const previousStatus = st;
    const flagged = await patchShiftById(shiftId, {
        status: SHIFT_STATUS_REASSIGNING,
    });
    if (!flagged.ok) return flagged;

    try {
        await tasks.trigger<typeof transferShiftTask>(
            "shifts.transfer",
            {
                shiftId,
                excludeWorkerUserId: workerUserId,
                previousStatus,
            },
            {
                tags: [`shift:${shiftId}`],
                idempotencyKey: `shift-transfer:${shiftId}`,
            },
        );
    } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to queue transfer";
        await patchShiftById(shiftId, { status: previousStatus });
        return { ok: false, message };
    }

    return { ok: true };
}

export async function cancelWorkerShift(
    workerUserId: string,
    shiftId: string,
): Promise<WorkerShiftActionResult> {
    const workerId = await getWorkerIdByUserId(workerUserId);
    if (!workerId) return { ok: false, message: "Worker profile not found" };

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row || row.worker_id !== workerId) {
        return { ok: false, message: "Shift not found" };
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_SCHEDULED) {
        return {
            ok: false,
            message: "Only scheduled shifts can be cancelled",
        };
    }

    return patchShiftById(shiftId, { status: SHIFT_STATUS_CANCELLED });
}
