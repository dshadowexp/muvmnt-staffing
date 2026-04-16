import { encrypt, decrypt } from '../../utils/crypt';

const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export type ShiftEmailAction = 'confirm' | 'decline';

/** Encrypted payload: `shiftId:workerUserId:action:expMs` */
export function createShiftEmailActionToken(
  shiftId: string,
  workerUserId: string,
  action: ShiftEmailAction,
): string {
  const exp = Date.now() + TTL_MS;
  return encrypt(`${shiftId}:${workerUserId}:${action}:${exp}`);
}

export function parseShiftEmailActionToken(token: string): {
  shiftId: string;
  workerUserId: string;
  action: ShiftEmailAction;
} | null {
  try {
    const raw = decrypt(token);
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [shiftId, workerUserId, actionRaw, expRaw] = parts;
    if (!shiftId || !workerUserId || !actionRaw || !expRaw) return null;
    if (actionRaw !== 'confirm' && actionRaw !== 'decline') return null;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || exp < Date.now()) return null;
    return { shiftId, workerUserId, action: actionRaw };
  } catch {
    return null;
  }
}
