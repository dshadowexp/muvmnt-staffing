import type { Database } from "@/services/supabase/types/database";

type StaffRequestRow = Database["public"]["Tables"]["staff_requests"]["Row"];

/** Input needed to price a staff request once rules exist (rates, multipliers, fees, etc.). */
export type StaffRequestPricingInput = Pick<
  StaffRequestRow,
  | "id"
  | "profession"
  | "hourly_rate"
  | "positions"
  | "start_date"
  | "end_date"
  | "start_time"
  | "end_time"
>;

/** Serializable draft for preview before a row exists (wizard). */
export type StaffRequestPricingDraft = {
  profession: string;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  positions: number;
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

/** Base hourly used before tier / experience adjustments. */
export function baseHourlyRateForProfession(profession: string): number {
  return Math.min(55, Math.max(18, hashProfessionToRateBase(profession)));
}

/** Total scheduled hours (all positions × days × daily shift length). */
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

export function simulateStaffRequestPricingQuote(
  draft: StaffRequestPricingDraft,
): StaffRequestPricingResult {
  const suggestedHourlyRate = baseHourlyRateForProfession(draft.profession);
  const estimatedTotalCents = estimatedTotalCentsForHourly(draft, suggestedHourlyRate);

  return {
    estimatedTotalCents,
    currency: "CAD",
    statusMessage:
      "Simulated estimate from role, shift length, and schedule. Replace with live pricing rules when ready.",
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
  return simulateStaffRequestPricingQuote({
    profession: input.profession,
    start_date: input.start_date,
    end_date: input.end_date,
    start_time: input.start_time,
    end_time: input.end_time,
    positions: input.positions,
  });
}
