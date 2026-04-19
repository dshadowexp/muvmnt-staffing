/**
 * Canonical `shifts.status` values. Status transitions follow the worker /
 * client lifecycle:
 *
 *   scheduled → confirmed → in_progress → checked_out → completed
 *           ↘ declined / cancelled       ↘ reassigning ↩
 */
export const SHIFT_STATUS_SCHEDULED = "scheduled";
export const SHIFT_STATUS_CONFIRMED = "confirmed";
export const SHIFT_STATUS_IN_PROGRESS = "in_progress";
export const SHIFT_STATUS_CHECKED_OUT = "checked_out";
export const SHIFT_STATUS_COMPLETED = "completed";
export const SHIFT_STATUS_REASSIGNING = "reassigning";
export const SHIFT_STATUS_CANCELLED = "cancelled";
export const SHIFT_STATUS_DECLINED = "declined";

/**
 * North-American **Eastern** wall clock used by `staff_requests` daily windows
 * and `shifts.start_time` / `shifts.end_time`. Postgres stores these as
 * `timestamptz` (UTC); conversion happens at insert/read time.
 *
 * `America/Toronto` shares DST rules with `America/New_York`.
 */
export const SHIFT_SCHEDULE_TIMEZONE = "America/Toronto";

export function normalizeShiftStatus(s: string | null | undefined): string {
    return (s ?? "").trim().toLowerCase();
}
