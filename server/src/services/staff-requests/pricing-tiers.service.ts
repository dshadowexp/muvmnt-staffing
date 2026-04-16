import {
  PRICING_TIER_CREDENTIALED,
  PRICING_TIER_SAME_PROFESSION,
  PRICING_TIER_STANDARD,
  UNSPECIFIED_STAFF_REQUEST_PROFESSION,
} from './constants';
import {
  buildMatchCandidatePool,
  filterCandidatesForPricingTier,
  type DailyWindowMatch,
} from './matching.service';
import { baseHourlyRateForProfession } from './staff-request-pricing';

export type PricingTierOfferDto = {
  tierId:         string;
  label:          string;
  description:    string;
  /** CAD / hr — persisted as `staff_requests.pricing_rate` when selected. */
  hourlyRate:     number;
  candidateCount: number;
  available:      boolean;
};

function roundRate(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Tier definitions: rates are multipliers on the profession base (see
 * {@link baseHourlyRateForProfession}). Candidate counts use the same pool
 * filters as matching ({@link filterCandidatesForPricingTier}).
 *
 * Uses only schedule **inputs** (`dailyWindows`, date range) and role filters — not a
 * persisted proposed-coverage blob (confirm re-runs matching from the same inputs).
 */
export async function buildPricingTierOffersForJob(params: {
  clientUserId: string;
  profession:   string;
  requirements: string[];
  startDateYmd: string;
  endDateYmd:   string | null;
  dailyWindows: DailyWindowMatch[];
}): Promise<{ tiers: PricingTierOfferDto[]; currency: 'CAD'; ringCellCount: number }> {
  const pool = await buildMatchCandidatePool({
    clientUserId: params.clientUserId,
    startDate:    params.startDateYmd,
    endDate:      params.endDateYmd,
    dailyWindows: params.dailyWindows,
  });

  const ringCellCount = pool.ok ? pool.ringCellCount : 0;
  const all           = pool.ok ? pool.candidates : [];

  const base = baseHourlyRateForProfession(params.profession);

  const jobProfNorm = params.profession.trim().toLowerCase();
  const showSameProfession =
    jobProfNorm.length > 0 &&
    jobProfNorm !== UNSPECIFIED_STAFF_REQUEST_PROFESSION.toLowerCase();

  const standard = await filterCandidatesForPricingTier(
    all,
    PRICING_TIER_STANDARD,
    params.profession,
    params.requirements,
  );
  const sameProf = showSameProfession
    ? await filterCandidatesForPricingTier(
        all,
        PRICING_TIER_SAME_PROFESSION,
        params.profession,
        params.requirements,
      )
    : [];
  const cred =
    params.requirements.length > 0
      ? await filterCandidatesForPricingTier(
          all,
          PRICING_TIER_CREDENTIALED,
          params.profession,
          params.requirements,
        )
      : [];

  const tiers: PricingTierOfferDto[] = [
    {
      tierId:         PRICING_TIER_STANDARD,
      label:          'Regional standard',
      description:    'Qualified workers in your area with overlapping availability.',
      hourlyRate:     roundRate(base * 1),
      candidateCount: standard.length,
      available:      standard.length > 0,
    },
  ];

  if (showSameProfession) {
    tiers.push({
      tierId:         PRICING_TIER_SAME_PROFESSION,
      label:          'Role-aligned',
      description:    `Workers whose role matches “${params.profession.trim()}”.`,
      hourlyRate:     roundRate(base * 1.08),
      candidateCount: sameProf.length,
      available:      sameProf.length > 0,
    });
  }

  if (params.requirements.length > 0) {
    tiers.push({
      tierId:         PRICING_TIER_CREDENTIALED,
      label:          'Credential-matched',
      description:    'Workers with verified certifications matching your stated requirements.',
      hourlyRate:     roundRate(base * 1.18),
      candidateCount: cred.length,
      available:      cred.length > 0,
    });
  }

  return { tiers, currency: 'CAD', ringCellCount };
}
