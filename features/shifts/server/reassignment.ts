import "server-only";

import { logger } from "@trigger.dev/sdk/v3";

import { STAFF_REQUEST_PROFESSION_PLACEHOLDER } from "@/features/requests/constants";
import { findReplacementUserIdForShiftWindow } from "@/features/requests/server/matching";

import {
    SHIFT_STATUS_CONFIRMED,
    SHIFT_STATUS_IN_PROGRESS,
    SHIFT_STATUS_REASSIGNING,
    SHIFT_STATUS_SCHEDULED,
    normalizeShiftStatus,
} from "../constants";
import {
    getShiftWithStaffRequest,
    getWorkerIdByUserId,
    getWorkerUserIdByWorkerId,
} from "../dal/queries";
import { patchShiftById } from "../dal/mutations";
import { shiftWindowFromTimestamps } from "../lib/shift-time";

export type ShiftTransferJobPayload = {
    shiftId: string;
    /** Worker user id who triggered the transfer; excluded from the search. */
    excludeWorkerUserId: string;
    /** Status to restore to (e.g. `confirmed`) if no replacement is found. */
    previousStatus: string;
};

/**
 * Run inside the trigger task — assumes the shift is already in
 * `reassigning`. Picks a replacement (single-worker greedy) or restores the
 * previous status if none is found.
 */
export async function processShiftTransferJob(
    payload: ShiftTransferJobPayload,
): Promise<void> {
    const { shiftId, excludeWorkerUserId, previousStatus } = payload;
    const prev = normalizeShiftStatus(previousStatus);
    if (prev !== SHIFT_STATUS_CONFIRMED && prev !== SHIFT_STATUS_IN_PROGRESS) {
        logger.warn("shift.transfer: invalid previousStatus, skipping", {
            shiftId,
            previousStatus,
        });
        return;
    }

    const row = await getShiftWithStaffRequest(shiftId);
    if (!row) {
        logger.warn("shift.transfer: shift not found", { shiftId });
        return;
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_REASSIGNING) {
        logger.log("shift.transfer: not in reassigning state, skipping", {
            shiftId,
            status: row.status,
        });
        return;
    }

    const holderUserId = await getWorkerUserIdByWorkerId(row.worker_id);
    if (holderUserId !== excludeWorkerUserId) {
        logger.warn(
            "shift.transfer: assigned worker mismatch, restoring previous status",
            { shiftId, holderUserId, excludeWorkerUserId },
        );
        await patchShiftById(shiftId, { status: previousStatus });
        return;
    }

    const sr = row.staff_requests;
    if (!sr?.pricing_tier) {
        logger.warn("shift.transfer: no pricing tier, restoring previous status", {
            shiftId,
        });
        await patchShiftById(shiftId, { status: previousStatus });
        return;
    }

    const win = shiftWindowFromTimestamps(row.start_time, row.end_time);
    if (!win) {
        logger.warn("shift.transfer: invalid shift times, restoring previous status", {
            shiftId,
        });
        await patchShiftById(shiftId, { status: previousStatus });
        return;
    }

    const replacementUserId = await findReplacementUserIdForShiftWindow({
        clientUserId: sr.client_id,
        dateYmd: win.dateYmd,
        startHHmm: win.startHHmm,
        endHHmm: win.endHHmm,
        pricingTierId: sr.pricing_tier,
        requestProfession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
        requirements: sr.requirements ?? [],
        excludeUserIds: [excludeWorkerUserId],
    });

    if (replacementUserId) {
        const newWorkerId = await getWorkerIdByUserId(replacementUserId);
        if (!newWorkerId) {
            logger.error("shift.transfer: replacement has no worker row", {
                shiftId,
                replacementUserId,
            });
            await patchShiftById(shiftId, { status: previousStatus });
            return;
        }
        const up = await patchShiftById(shiftId, {
            worker_id: newWorkerId,
            status: SHIFT_STATUS_SCHEDULED,
        });
        if (!up.ok) {
            logger.error("shift.transfer: failed to assign replacement", {
                shiftId,
                message: up.message,
            });
        } else {
            logger.log("shift.transfer: replacement assigned", {
                shiftId,
                newWorkerId,
            });
        }
        return;
    }

    const up = await patchShiftById(shiftId, { status: previousStatus });
    if (!up.ok) {
        logger.error("shift.transfer: failed to restore previous status", {
            shiftId,
            message: up.message,
        });
    } else {
        logger.log("shift.transfer: no replacement found, restored previous status", {
            shiftId,
        });
    }
}

/** If trigger retries are exhausted, ensure the shift isn't stuck in `reassigning`. */
export async function restoreStuckReassigningShift(
    shiftId: string,
    previousStatus: string,
): Promise<void> {
    const row = await getShiftWithStaffRequest(shiftId);
    if (!row) return;
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_REASSIGNING) return;
    await patchShiftById(shiftId, { status: previousStatus });
}
