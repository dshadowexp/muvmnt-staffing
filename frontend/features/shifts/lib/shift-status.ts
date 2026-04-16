/** Normalized for comparisons (lowercase, trimmed). */
export function normalizeShiftStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

/** Shifts awaiting worker confirm / decline / cancel (matches DB after staff-request confirm). */
export function isScheduledShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "scheduled";
}

/** @deprecated Use {@link isScheduledShiftStatus} — legacy name from “pending” copy. */
export function isPendingShiftStatus(status: string | null | undefined): boolean {
  return isScheduledShiftStatus(status);
}

export function isCancelledShiftStatus(status: string | null | undefined): boolean {
  const s = normalizeShiftStatus(status);
  return s === "cancelled" || s === "canceled";
}

export function isConfirmedShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "confirmed";
}

export function isInProgressShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "in_progress";
}

export function isReassigningShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "reassigning";
}

export function isDeclinedShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "declined";
}

export function isCheckedOutShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "checked_out";
}

export function isCompletedShiftStatus(status: string | null | undefined): boolean {
  return normalizeShiftStatus(status) === "completed";
}
