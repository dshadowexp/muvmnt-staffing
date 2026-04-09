/** Aligns with Fastify `CreateAndMatchReply.tiers` items. */

export type MatchedWorkerPreview = {
  userId: string;
  displayName: string;
  yearsExp: number;
};

export type StaffMatchTierId = "pulse" | "harbor" | "summit";

export type StaffMatchTier = {
  tierId: StaffMatchTierId;
  name: string;
  tagline: string;
  worker: MatchedWorkerPreview | null;
  hourlyRate: number;
  estimatedTotalCents: number;
};

export type CreateAndMatchApiData = {
  jobId: string;
  tiers: StaffMatchTier[];
  ringCellCount: number;
  candidateCount: number;
  currency: "CAD";
};
