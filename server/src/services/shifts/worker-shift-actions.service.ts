import { UNSPECIFIED_STAFF_REQUEST_PROFESSION } from '../staff-requests/constants';
import { findReplacementUserIdForShiftWindow } from '../staff-requests/matching.service';
import {
  getShiftWithStaffRequest,
  getWorkerIdByUserId,
  parseDailyWindows,
  updateShiftById,
} from './shift.repository';
import { shiftWindowFromTimestamps } from './shift-time';
import { getShiftsCycleQueue } from '../../background/shift-cycle.queue';
import {
  SHIFT_STATUS_CANCELLED,
  SHIFT_STATUS_CHECKED_OUT,
  SHIFT_STATUS_CONFIRMED,
  SHIFT_STATUS_DECLINED,
  SHIFT_STATUS_IN_PROGRESS,
  SHIFT_STATUS_REASSIGNING,
  SHIFT_STATUS_SCHEDULED,
} from './shift.constants';

function normStatus(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

export type WorkerShiftActionResult = { ok: true } | { ok: false; message: string };

export async function confirmWorkerShift(
  workerUserId: string,
  shiftId:      string,
): Promise<WorkerShiftActionResult> {
  const workerId = await getWorkerIdByUserId(workerUserId);
  if (!workerId) return { ok: false, message: 'Worker profile not found' };

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row || row.worker_id !== workerId) return { ok: false, message: 'Shift not found' };
  if (normStatus(row.status) !== SHIFT_STATUS_SCHEDULED) {
    return { ok: false, message: 'Only scheduled shifts can be confirmed' };
  }

  const now = new Date().toISOString();
  const up = await updateShiftById(shiftId, {
    status:       SHIFT_STATUS_CONFIRMED,
    confirm_time: now,
  });
  return up.ok ? { ok: true } : { ok: false, message: up.message };
}

export async function declineWorkerShift(
  workerUserId: string,
  shiftId:      string,
): Promise<WorkerShiftActionResult> {
  const workerId = await getWorkerIdByUserId(workerUserId);
  if (!workerId) return { ok: false, message: 'Worker profile not found' };

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row || row.worker_id !== workerId) return { ok: false, message: 'Shift not found' };
  if (normStatus(row.status) !== SHIFT_STATUS_SCHEDULED) {
    return { ok: false, message: 'Only scheduled shifts can be declined' };
  }

  const sr = row.staff_requests;
  if (!sr?.pricing_tier) {
    return { ok: false, message: 'Shift request has no pricing tier; cannot re-match' };
  }

  const win = shiftWindowFromTimestamps(row.start_time, row.end_time);
  if (!win) return { ok: false, message: 'Shift has invalid times' };

  const dailyWindows = parseDailyWindows(sr.daily_time_windows);
  const replacementUserId = await findReplacementUserIdForShiftWindow({
    clientUserId:        sr.client_id,
    dateYmd:             win.dateYmd,
    startHHmm:           win.startHHmm,
    endHHmm:             win.endHHmm,
    pricingTierId:       sr.pricing_tier,
    requestProfession:   UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements:        sr.requirements ?? [],
    excludeUserIds:      [workerUserId],
    dailyWindowsForPool: dailyWindows,
  });

  if (replacementUserId) {
    const newWorkerId = await getWorkerIdByUserId(replacementUserId);
    if (!newWorkerId) {
      const up = await updateShiftById(shiftId, { status: SHIFT_STATUS_DECLINED });
      return up.ok
        ? { ok: false, message: 'Replacement could not be linked to a worker profile' }
        : { ok: false, message: up.message };
    }
    const up = await updateShiftById(shiftId, {
      worker_id: newWorkerId,
      status:    SHIFT_STATUS_SCHEDULED,
    });
    return up.ok ? { ok: true } : { ok: false, message: up.message };
  }

  const up = await updateShiftById(shiftId, { status: SHIFT_STATUS_DECLINED });
  return up.ok ? { ok: true } : { ok: false, message: up.message };
}

export async function checkInWorkerShift(
  workerUserId: string,
  shiftId: string,
): Promise<WorkerShiftActionResult> {
  const workerId = await getWorkerIdByUserId(workerUserId);
  if (!workerId) return { ok: false, message: 'Worker profile not found' };

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row || row.worker_id !== workerId) return { ok: false, message: 'Shift not found' };
  if (normStatus(row.status) !== SHIFT_STATUS_CONFIRMED) {
    return { ok: false, message: 'Only confirmed shifts can be checked in' };
  }

  const now = new Date().toISOString();
  const up = await updateShiftById(shiftId, {
    status:       SHIFT_STATUS_IN_PROGRESS,
    checkin_time: now,
  });
  return up.ok ? { ok: true } : { ok: false, message: up.message };
}

export async function checkOutWorkerShift(
  workerUserId: string,
  shiftId: string,
): Promise<WorkerShiftActionResult> {
  const workerId = await getWorkerIdByUserId(workerUserId);
  if (!workerId) return { ok: false, message: 'Worker profile not found' };

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row || row.worker_id !== workerId) return { ok: false, message: 'Shift not found' };
  if (normStatus(row.status) !== SHIFT_STATUS_IN_PROGRESS) {
    return { ok: false, message: 'Only in-progress shifts can be checked out' };
  }

  const now = new Date().toISOString();
  const up = await updateShiftById(shiftId, {
    status:        SHIFT_STATUS_CHECKED_OUT,
    checkout_time: now,
  });
  return up.ok ? { ok: true } : { ok: false, message: up.message };
}

/**
 * Marks the shift as {@link SHIFT_STATUS_REASSIGNING} and enqueues matching to assign another worker.
 * Allowed from {@link SHIFT_STATUS_CONFIRMED} only (in-progress workers must check out first).
 */
export async function requestWorkerShiftTransfer(
  workerUserId: string,
  shiftId: string,
): Promise<WorkerShiftActionResult> {
  const workerId = await getWorkerIdByUserId(workerUserId);
  if (!workerId) return { ok: false, message: 'Worker profile not found' };

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row || row.worker_id !== workerId) return { ok: false, message: 'Shift not found' };

  const st = normStatus(row.status);
  if (st === SHIFT_STATUS_REASSIGNING) {
    return { ok: false, message: 'A transfer is already in progress for this shift' };
  }
  if (st !== SHIFT_STATUS_CONFIRMED) {
    return { ok: false, message: 'Only confirmed shifts can be transferred' };
  }

  const previousStatus = st;
  const up = await updateShiftById(shiftId, { status: SHIFT_STATUS_REASSIGNING });
  if (!up.ok) return { ok: false, message: up.message };

  try {
    await getShiftsCycleQueue().enqueueReplacementTransfer({
      shiftId,
      excludeWorkerUserId: workerUserId,
      previousStatus,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to queue transfer';
    await updateShiftById(shiftId, { status: previousStatus });
    return { ok: false, message };
  }

  return { ok: true };
}

export async function cancelWorkerShift(
  workerUserId: string,
  shiftId:      string,
): Promise<WorkerShiftActionResult> {
  const workerId = await getWorkerIdByUserId(workerUserId);
  if (!workerId) return { ok: false, message: 'Worker profile not found' };

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row || row.worker_id !== workerId) return { ok: false, message: 'Shift not found' };
  if (normStatus(row.status) !== SHIFT_STATUS_SCHEDULED) {
    return { ok: false, message: 'Only scheduled shifts can be cancelled' };
  }

  const up = await updateShiftById(shiftId, { status: SHIFT_STATUS_CANCELLED });
  return up.ok ? { ok: true } : { ok: false, message: up.message };
}
