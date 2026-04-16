import { logger } from '../../config/logger';
import { supabase } from '../../config/supabase';
import { UNSPECIFIED_STAFF_REQUEST_PROFESSION } from '../staff-requests/constants';
import { findReplacementUserIdForShiftWindow } from '../staff-requests/matching.service';
import {
  getShiftWithStaffRequest,
  getWorkerIdByUserId,
  parseDailyWindows,
  updateShiftById,
} from './shift.repository';
import { shiftWindowFromTimestamps } from './shift-time';
import {
  SHIFT_STATUS_CONFIRMED,
  SHIFT_STATUS_IN_PROGRESS,
  SHIFT_STATUS_REASSIGNING,
  SHIFT_STATUS_SCHEDULED,
} from './shift.constants';

function normStatus(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

export type ShiftTransferJobPayload = {
  shiftId: string;
  excludeWorkerUserId: string;
  /** Restore if no replacement is found (e.g. `confirmed`, or legacy `in_progress`). */
  previousStatus: string;
};

export async function getWorkerUserIdByWorkerId(workerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('user_id')
    .eq('id', workerId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data?.user_id ?? null;
}

/**
 * BullMQ worker: find a replacement for a shift left by {@link payload.excludeWorkerUserId}.
 * Expects the shift to be in {@link SHIFT_STATUS_REASSIGNING}.
 */
export async function processShiftTransferJob(payload: ShiftTransferJobPayload): Promise<void> {
  const { shiftId, excludeWorkerUserId, previousStatus } = payload;
  const prevNorm = normStatus(previousStatus);
  if (prevNorm !== SHIFT_STATUS_CONFIRMED && prevNorm !== SHIFT_STATUS_IN_PROGRESS) {
    logger.warn({ shiftId, previousStatus }, 'shift.transfer: invalid previousStatus, skipping');
    return;
  }

  const row = await getShiftWithStaffRequest(shiftId);
  if (!row) {
    logger.warn({ shiftId }, 'shift.transfer: shift not found');
    return;
  }

  if (normStatus(row.status) !== SHIFT_STATUS_REASSIGNING) {
    logger.info({ shiftId, status: row.status }, 'shift.transfer: not in reassigning state, skipping');
    return;
  }

  const holderUserId = await getWorkerUserIdByWorkerId(row.worker_id);
  if (holderUserId !== excludeWorkerUserId) {
    logger.warn(
      { shiftId, holderUserId, excludeWorkerUserId },
      'shift.transfer: assigned worker mismatch, restoring previous status',
    );
    await updateShiftById(shiftId, { status: previousStatus });
    return;
  }

  const sr = row.staff_requests;
  if (!sr?.pricing_tier) {
    logger.warn({ shiftId }, 'shift.transfer: no pricing tier, restoring previous status');
    await updateShiftById(shiftId, { status: previousStatus });
    return;
  }

  const win = shiftWindowFromTimestamps(row.start_time, row.end_time);
  if (!win) {
    logger.warn({ shiftId }, 'shift.transfer: invalid shift times, restoring previous status');
    await updateShiftById(shiftId, { status: previousStatus });
    return;
  }

  const dailyWindows = parseDailyWindows(sr.daily_time_windows);
  const replacementUserId = await findReplacementUserIdForShiftWindow({
    clientUserId:        sr.client_id,
    dateYmd:             win.dateYmd,
    startHHmm:           win.startHHmm,
    endHHmm:             win.endHHmm,
    pricingTierId:       sr.pricing_tier,
    requestProfession:   UNSPECIFIED_STAFF_REQUEST_PROFESSION,
    requirements:        sr.requirements ?? [],
    excludeUserIds:      [excludeWorkerUserId],
    dailyWindowsForPool: dailyWindows,
  });

  if (replacementUserId) {
    const newWorkerId = await getWorkerIdByUserId(replacementUserId);
    if (!newWorkerId) {
      logger.error({ shiftId, replacementUserId }, 'shift.transfer: replacement has no worker row');
      await updateShiftById(shiftId, { status: previousStatus });
      return;
    }
    const up = await updateShiftById(shiftId, {
      worker_id: newWorkerId,
      status:    SHIFT_STATUS_SCHEDULED,
    });
    if (!up.ok) {
      logger.error({ shiftId, message: up.message }, 'shift.transfer: failed to assign replacement');
    } else {
      logger.info({ shiftId, newWorkerId }, 'shift.transfer: replacement assigned');
    }
    return;
  }

  const up = await updateShiftById(shiftId, { status: previousStatus });
  if (!up.ok) {
    logger.error({ shiftId, message: up.message }, 'shift.transfer: failed to restore previous status');
  } else {
    logger.info({ shiftId }, 'shift.transfer: no replacement found, restored previous status');
  }
}

/** If BullMQ exhausts retries, avoid leaving the shift stuck in {@link SHIFT_STATUS_REASSIGNING}. */
export async function restoreStuckReassigningShift(
  shiftId: string,
  previousStatus: string,
): Promise<void> {
  const row = await getShiftWithStaffRequest(shiftId);
  if (!row) return;
  if (normStatus(row.status) !== SHIFT_STATUS_REASSIGNING) return;
  await updateShiftById(shiftId, { status: previousStatus });
}
