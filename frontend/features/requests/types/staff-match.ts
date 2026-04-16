/** Aligns with Fastify `CreateAndMatchReply` (server staff-requests.schema). */

export type WorkerAssignment = {
  userId: string;
  displayName: string;
  yearsExp: number;
  photoUrl: string | null;
  startTime: string;
  endTime: string;
};

export type DaySchedule = {
  date: string;
  dayOfWeek: number;
  assignments: WorkerAssignment[];
  covered: boolean;
};

export type CreateAndMatchApiData = {
  jobId: string;
  schedule: DaySchedule[];
  totalWorkers: number;
  fullyCovered: boolean;
  candidateCount: number;
  ringCellCount: number;
  currency: "CAD";
  /** Present when the API echoes persisted tier / rate after match. */
  pricingTier?: string;
  pricingRate?: number;
};

export type PricingTierOffer = {
  tierId: string;
  label: string;
  description: string;
  hourlyRate: number;
  candidateCount: number;
  available: boolean;
};

export type StaffRequestPricingTiersData = {
  tiers: PricingTierOffer[];
  currency: "CAD";
  ringCellCount: number;
};
