/** Mirrors frontend pricing helpers for staff-request totals. */

export type StaffRequestPricingDraft = {
  profession: string;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  positions: number;
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

function billableDaysInclusive(startDateIso: string, endDateIso: string | null): number {
  const start = new Date(startDateIso);
  if (Number.isNaN(start.getTime())) return 1;
  if (!endDateIso) return 1;
  const end = new Date(endDateIso);
  if (Number.isNaN(end.getTime())) return 1;
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 1;
  return Math.floor(ms / 86_400_000) + 1;
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
  const days = billableDaysInclusive(draft.start_date, draft.end_date);
  const hoursPerDay = hoursPerShift(draft.start_time, draft.end_time);
  return hoursPerDay * days * Math.max(1, draft.positions);
}

export function estimatedTotalCentsForHourly(
  draft: StaffRequestPricingDraft,
  hourlyRate: number,
): number {
  return Math.round(totalBillableHours(draft) * hourlyRate * 100);
}
