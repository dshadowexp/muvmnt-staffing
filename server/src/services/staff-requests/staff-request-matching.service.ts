import { supabase } from '../../config/supabase';
import { getCellsInRing } from '../../config/h3';
import {
  baseHourlyRateForProfession,
  estimatedTotalCentsForHourly,
  type StaffRequestPricingDraft,
} from './staff-request-pricing';

const H3_K = 2;

export type MatchedWorkerPreview = {
  userId: string;
  displayName: string;
  yearsExp: number;
};

export type StaffMatchTierId = 'pulse' | 'harbor' | 'summit';

export type StaffMatchTier = {
  tierId: StaffMatchTierId;
  name: string;
  tagline: string;
  worker: MatchedWorkerPreview | null;
  hourlyRate: number;
  estimatedTotalCents: number;
};

const TIER_DEFS: Record<
  StaffMatchTierId,
  { name: string; tagline: string; experienceMul: number }
> = {
  pulse: {
    name: 'Pulse Runner',
    tagline: 'Swift coverage — ideal when speed and value matter most.',
    experienceMul: 0.92,
  },
  harbor: {
    name: 'Harbor Line',
    tagline: 'Balanced depth — steady hands, fair middle ground.',
    experienceMul: 1.0,
  },
  summit: {
    name: 'Summit Anchor',
    tagline: 'Peak credential — seasoned pros for high-stakes shifts.',
    experienceMul: 1.14,
  },
};

const TIER_ORDER: StaffMatchTierId[] = ['pulse', 'harbor', 'summit'];

function displayName(first: string, last: string): string {
  const initial = last.trim().charAt(0);
  return initial ? `${first.trim()} ${initial}.` : first.trim();
}

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function workerMeetsRequirements(
  yearsExp: number,
  certNames: string[],
  requirements: string[],
): boolean {
  if (requirements.length === 0) return true;
  const certs = certNames.map(norm);
  for (const req of requirements) {
    const r = norm(req);
    if (
      r.includes('2+ years') ||
      r.includes('2 years experience') ||
      r === '2+ years experience'
    ) {
      if (yearsExp < 2) return false;
      continue;
    }
    const hit = certs.some((c) => c.includes(r) || r.includes(c));
    if (!hit) return false;
  }
  return true;
}

function hourlyForTier(
  base: number,
  tierId: StaffMatchTierId,
  yearsExp: number,
): number {
  const mul = TIER_DEFS[tierId].experienceMul;
  const raw = base * mul + yearsExp * 0.4;
  return Math.max(15, Math.round(raw * 100) / 100);
}

function assignTiers(
  draft: StaffRequestPricingDraft,
  profession: string,
  sortedCandidates: MatchedWorkerPreview[],
): StaffMatchTier[] {
  const base = baseHourlyRateForProfession(profession);
  const n = sortedCandidates.length;

  const pickWorker = (idx: number): MatchedWorkerPreview | null => {
    if (n === 0) return null;
    if (idx >= 0 && idx < n) return sortedCandidates[idx]!;
    return null;
  };

  let summitW: MatchedWorkerPreview | null;
  let harborW: MatchedWorkerPreview | null;
  let pulseW: MatchedWorkerPreview | null;

  if (n >= 3) {
    summitW = pickWorker(0);
    harborW = pickWorker(Math.floor(n / 2));
    pulseW = pickWorker(n - 1);
  } else if (n === 2) {
    summitW = pickWorker(0);
    harborW = pickWorker(1);
    pulseW = null;
  } else if (n === 1) {
    summitW = pickWorker(0);
    harborW = null;
    pulseW = null;
  } else {
    summitW = null;
    harborW = null;
    pulseW = null;
  }

  const workerByTier: Record<StaffMatchTierId, MatchedWorkerPreview | null> = {
    summit: summitW,
    harbor: harborW,
    pulse: pulseW,
  };

  return TIER_ORDER.map((tierId) => {
    const w = workerByTier[tierId];
    const exp = w?.yearsExp ?? 0;
    const rate = hourlyForTier(base, tierId, exp);
    return {
      tierId,
      name: TIER_DEFS[tierId].name,
      tagline: TIER_DEFS[tierId].tagline,
      worker: w,
      hourlyRate: rate,
      estimatedTotalCents: estimatedTotalCentsForHourly(draft, rate),
    };
  });
}

export async function matchWorkersForStaffRequest(params: {
  clientUserId: string;
  profession: string;
  requirements: string[];
  tasks: string[];
  pricingDraft: StaffRequestPricingDraft;
}): Promise<{
  tiers: StaffMatchTier[];
  ringCellCount: number;
  candidateCount: number;
}> {
  const { data: clientLoc, error: locError } = await supabase
    .from('locations')
    .select('lat, lng, cell_id')
    .eq('user_id', params.clientUserId)
    .single();

  if (locError || clientLoc == null) {
    return {
      tiers: assignTiers(params.pricingDraft, params.profession, []),
      ringCellCount: 0,
      candidateCount: 0,
    };
  }

  const ring = getCellsInRing(clientLoc.lat, clientLoc.lng, H3_K);
  const ringCellCount = ring.length;

  const { data: locRows, error: ringError } = await supabase
    .from('locations')
    .select('user_id')
    .in('cell_id', ring);

  if (ringError || locRows == null) {
    return {
      tiers: assignTiers(params.pricingDraft, params.profession, []),
      ringCellCount,
      candidateCount: 0,
    };
  }

  const neighborIds = [
    ...new Set(
      locRows
        .map((r) => r.user_id)
        .filter((id) => id && id !== params.clientUserId),
    ),
  ];

  if (neighborIds.length === 0) {
    return {
      tiers: assignTiers(params.pricingDraft, params.profession, []),
      ringCellCount,
      candidateCount: 0,
    };
  }

  const { data: workers, error: wError } = await supabase
    .from('workers')
    .select('user_id, first_name, last_name, profession, years_exp, status')
    .in('user_id', neighborIds)
    .eq('profession', params.profession);

  if (wError || workers == null || workers.length === 0) {
    return {
      tiers: assignTiers(params.pricingDraft, params.profession, []),
      ringCellCount,
      candidateCount: 0,
    };
  }

  const workerUserIds = workers.map((w) => w.user_id);

  const { data: users, error: uError } = await supabase
    .from('users')
    .select('id, is_active, role')
    .in('id', workerUserIds)
    .eq('role', 'worker');

  if (uError || users == null) {
    return {
      tiers: assignTiers(params.pricingDraft, params.profession, []),
      ringCellCount,
      candidateCount: 0,
    };
  }

  const activeUserIds = new Set(
    users.filter((u) => u.is_active !== false).map((u) => u.id),
  );

  const { data: certs, error: cError } = await supabase
    .from('certifications')
    .select('user_id, name')
    .in('user_id', workerUserIds);

  const certsByUser = new Map<string, string[]>();
  if (!cError && certs) {
    for (const row of certs) {
      const list = certsByUser.get(row.user_id) ?? [];
      list.push(row.name);
      certsByUser.set(row.user_id, list);
    }
  }

  const candidates: MatchedWorkerPreview[] = [];

  for (const w of workers) {
    if (!activeUserIds.has(w.user_id)) continue;
    if (
      w.status != null &&
      w.status !== '' &&
      w.status.toLowerCase() === 'inactive'
    ) {
      continue;
    }
    const names = certsByUser.get(w.user_id) ?? [];
    if (!workerMeetsRequirements(w.years_exp, names, params.requirements)) continue;
    candidates.push({
      userId: w.user_id,
      displayName: displayName(w.first_name, w.last_name),
      yearsExp: w.years_exp,
    });
  }

  candidates.sort((a, b) => b.yearsExp - a.yearsExp);

  const tiers = assignTiers(params.pricingDraft, params.profession, candidates);

  return {
    tiers,
    ringCellCount,
    candidateCount: candidates.length,
  };
}
