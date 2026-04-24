import type { DaySchedule } from "../server/matching";

/** One scheduled time-of-day window expressed as `HH:mm` strings. */
export type StaffRequestPricingDraft = {
  positions: number;
  dailyWindows: {
    date: string;
    slots: { startTime: string; endTime: string }[];
  }[];
};

function normalizeTimeForCalc(time: string): { h: number; m: number } {
  const parts = time.split(":");
  return {
    h: Number(parts[0]),
    m: Number(parts[1] ?? 0),
  };
}

function hoursPerShift(startTime: string, endTime: string): number {
  const s = normalizeTimeForCalc(startTime);
  const e = normalizeTimeForCalc(endTime);
  const startMins = s.h * 60 + s.m;
  const endMins = e.h * 60 + e.m;
  return Math.max(0, (endMins - startMins) / 60);
}

/** Total scheduled hours (all positions × per-day shift lengths). */
export function totalBillableHours(draft: StaffRequestPricingDraft): number {
  const pos = Math.max(1, draft.positions);
  let hours = 0;
  for (const day of draft.dailyWindows) {
    for (const slot of day.slots) {
      hours += hoursPerShift(slot.startTime, slot.endTime);
    }
  }
  return hours * pos;
}

/** Estimate total charge in cents for the **scheduled** request (full hours). */
export function estimatedTotalCentsForHourly(
  draft: StaffRequestPricingDraft,
  hourlyRate: number,
): number {
  return Math.round(totalBillableHours(draft) * hourlyRate * 100);
}

/** Sum of shift lengths from matched worker assignments (person-hours). */
export function totalCoveredHoursFromMatchSchedule(schedule: DaySchedule[]): number {
  let hours = 0;
  for (const day of schedule) {
    for (const a of day.assignments) {
      hours += hoursPerShift(a.startTime, a.endTime);
    }
  }
  return hours;
}

/** Estimate total charge in cents for **matched coverage only** (partial or full). */
export function estimatedCoverageTotalCentsForHourly(
  schedule: DaySchedule[],
  hourlyRate: number,
): number {
  return Math.round(totalCoveredHoursFromMatchSchedule(schedule) * hourlyRate * 100);
}
