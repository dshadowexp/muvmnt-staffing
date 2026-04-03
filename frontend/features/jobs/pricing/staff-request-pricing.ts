import type { Database } from "@/services/supabase/types/database";

type JobInfoRow = Database["public"]["Tables"]["job_infos"]["Row"];

/** Input needed to price a staff request once rules exist (rates, multipliers, fees, etc.). */
export type StaffRequestPricingInput = Pick<
  JobInfoRow,
  | "id"
  | "profession"
  | "hourly_rate"
  | "positions"
  | "start_date"
  | "end_date"
  | "start_time"
  | "end_time"
>;

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

/**
 * Estimates pricing for a recorded staff request.
 * Implement your billing rules here (base rate, duration, surcharges, platform fee, etc.).
 */
export async function calculateStaffRequestPricing(
  _input: StaffRequestPricingInput,
): Promise<StaffRequestPricingResult> {
  return {
    estimatedTotalCents: null,
    currency: "CAD",
    statusMessage: "Pricing has not been configured yet.",
    suggestedHourlyRate: null,
  };
}
