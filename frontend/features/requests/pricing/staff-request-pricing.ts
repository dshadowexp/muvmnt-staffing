import type { Database } from "@/services/supabase/types/database";
import { STAFF_REQUEST_PROFESSION_PLACEHOLDER } from "../constants";
import { calendarDayStrings } from "../lib/calendar-day-strings";
import { parseStaffRequestDailyWindows } from "../lib/parse-staff-request-daily-windows";
import type { DaySchedule } from "../types/staff-match";

type StaffRequestRow = Database["public"]["Tables"]["staff_requests"]["Row"];

/** Input needed to price a staff request once rules exist (rates, multipliers, fees, etc.). */
export type StaffRequestPricingInput = Pick<
  StaffRequestRow,
  "id" | "pricing_rate" | "positions" | "start_date" | "end_date" | "daily_time_windows"
>;

/** Serializable draft for preview before a row exists (wizard). */
export type StaffRequestPricingDraft = {
  profession: string;
  start_date: string;
  end_date: string | null;
  positions: number;
  dailyWindows: {
    date: string;
    slots: { startTime: string; endTime: string }[];
  }[];
};

export type StaffRequestPricingResult = {
  /** Total estimate in minor units when pricing is implemented; null until then */
  estimatedTotalCents: number | null;
  currency: string;
  /** Shown in the UI until real pricing is wired up */
  statusMessage: string;
  /**
   * When set, pre-fills the “accept rate” control. Usually derived from calculation.
   * Null until pricing rules produce a quote.
   */
  suggestedHourlyRate: number | null;
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

function hashProfessionToRateBase(profession: string): number {
  let sum = 0;
  for (let i = 0; i < profession.length; i += 1) {
    sum += profession.charCodeAt(i);
  }
  return 20 + (sum % 20);
}

/** Base hourly used before tier / experience adjustments. */
export function baseHourlyRateForProfession(profession: string): number {
  return Math.min(55, Math.max(18, hashProfessionToRateBase(profession)));
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

export function simulateStaffRequestPricingQuote(
  draft: StaffRequestPricingDraft,
): StaffRequestPricingResult {
  const suggestedHourlyRate = baseHourlyRateForProfession(draft.profession);
  const estimatedTotalCents = estimatedTotalCentsForHourly(draft, suggestedHourlyRate);

  return {
    estimatedTotalCents,
    currency: "CAD",
    statusMessage:
      "Simulated estimate from shift length and schedule. Replace with live pricing rules when ready.",
    suggestedHourlyRate,
  };
}

/**
 * Estimates pricing for a recorded staff request.
 * Today this uses the same simulator as the wizard preview; swap the body for real billing rules.
 */
export async function calculateStaffRequestPricing(
  input: StaffRequestPricingInput,
): Promise<StaffRequestPricingResult> {
  let dailyWindows = parseStaffRequestDailyWindows(input.daily_time_windows);
  if (dailyWindows.length === 0) {
    const start = new Date(input.start_date);
    const end = input.end_date ? new Date(input.end_date) : null;
    const days = calendarDayStrings(start, end);
    dailyWindows = days.map((date) => ({
      date,
      slots: [{ startTime: "09:00", endTime: "17:00" }],
    }));
  }
  return simulateStaffRequestPricingQuote({
    profession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
    start_date: input.start_date,
    end_date: input.end_date,
    positions: input.positions,
    dailyWindows,
  });
}
