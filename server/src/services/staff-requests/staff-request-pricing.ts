/** Mirrors frontend pricing helpers for staff-request totals. */

export type StaffRequestDaySlot = {
  startTime: string;
  endTime: string;
};

export type StaffRequestDailyWindow = {
  date:  string;
  slots: StaffRequestDaySlot[];
};

export type StaffRequestPricingDraft = {
  profession: string;
  start_date: string;
  end_date: string | null;
  positions: number;
  dailyWindows: StaffRequestDailyWindow[];
};

function normalizeTimeForCalc(time: string): { h: number; m: number } {
  const parts = time.split(':');
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

function hashProfessionToRateBase(profession: string): number {
  let sum = 0;
  for (let i = 0; i < profession.length; i += 1) {
    sum += profession.charCodeAt(i);
  }
  return 20 + (sum % 20);
}

export function baseHourlyRateForProfession(profession: string): number {
  return Math.min(55, Math.max(18, hashProfessionToRateBase(profession)));
}

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

export function estimatedTotalCentsForHourly(
  draft: StaffRequestPricingDraft,
  hourlyRate: number,
): number {
  return Math.round(totalBillableHours(draft) * hourlyRate * 100);
}
