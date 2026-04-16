import { logger } from '../../config/logger';
import { getShiftsCycleQueue } from '../../background/shift-cycle.queue';
import { getShiftWithStaffRequest, updateShiftById } from './shift.repository';
import { SHIFT_STATUS_CHECKED_OUT, SHIFT_STATUS_COMPLETED } from './shift.constants';

function normStatus(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

export type ClientShiftActionResult = { ok: true } | { ok: false; message: string };

/**
 * Client confirms the worker finished the shift after checkout. Sets status to completed
 * and enqueues payroll transfer processing.
 */
export async function completeClientShift(
  clientUserId: string,
  shiftId: string,
): Promise<ClientShiftActionResult> {
  const row = await getShiftWithStaffRequest(shiftId);
  if (!row) return { ok: false, message: 'Shift not found' };

  const sr = row.staff_requests;
  if (!sr || sr.client_id !== clientUserId) {
    return { ok: false, message: 'Shift not found' };
  }

  if (normStatus(row.status) !== SHIFT_STATUS_CHECKED_OUT) {
    return { ok: false, message: 'Only checked-out shifts can be marked complete' };
  }

  const now = new Date().toISOString();
  const up = await updateShiftById(shiftId, {
    status:         SHIFT_STATUS_COMPLETED,
    complete_time:  now,
  });
  if (!up.ok) return { ok: false, message: up.message };

  try {
    await getShiftsCycleQueue().enqueueWorkerPayoutForShift(shiftId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to queue payout';
    logger.error({ shiftId, err: e }, 'completeClientShift: enqueue payout failed');
    await updateShiftById(shiftId, {
      status:        SHIFT_STATUS_CHECKED_OUT,
      complete_time: null,
    });
    return { ok: false, message };
  }

  return { ok: true };
}
