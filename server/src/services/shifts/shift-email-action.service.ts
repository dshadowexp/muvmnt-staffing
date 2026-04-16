import { parseShiftEmailActionToken, type ShiftEmailAction } from './shift-email-token';
import { confirmWorkerShift, declineWorkerShift } from './worker-shift-actions.service';

export type ShiftEmailActionPageResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function applyShiftActionFromEmailToken(
  token: string,
  expectedAction: ShiftEmailAction,
): Promise<ShiftEmailActionPageResult> {
  const parsed = parseShiftEmailActionToken(token);
  if (parsed == null) {
    return { ok: false, message: 'This link is invalid or has expired.' };
  }
  if (parsed.action !== expectedAction) {
    return { ok: false, message: 'This link does not match that action.' };
  }

  if (expectedAction === 'confirm') {
    const r = await confirmWorkerShift(parsed.workerUserId, parsed.shiftId);
    return r.ok
      ? { ok: true, message: 'Your shift is confirmed. Thank you.' }
      : { ok: false, message: r.message };
  }

  const r = await declineWorkerShift(parsed.workerUserId, parsed.shiftId);
  return r.ok
    ? { ok: true, message: 'You have declined this shift. Another worker may be assigned.' }
    : { ok: false, message: r.message };
}
