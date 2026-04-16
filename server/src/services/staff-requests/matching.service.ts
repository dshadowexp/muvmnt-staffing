import { supabase } from '../../config/supabase';
import { getCellsInRing } from '../../config/h3';
import type { Tables } from '../../types/database';
import {
  PRICING_TIER_CREDENTIALED,
  PRICING_TIER_SAME_PROFESSION,
  PRICING_TIER_STANDARD,
} from './constants';
import { enumerateCalendarDays } from './calendar-days';

// ─── Constants ────────────────────────────────────────────────────────────────

const H3_K = 5;

// ─── DB Row Types (from database.ts) ─────────────────────────────────────────
 
type UserRow         = Tables<'users'>;
type AvailabilityRow = Tables<'availability'>;
type AvailabilitySlotRow = Pick<
  AvailabilityRow,
  'user_id' | 'day_of_week' | 'start_time' | 'end_time'
>;

// ─── Internal Types ───────────────────────────────────────────────────────────

/** A time interval in minutes-since-midnight */
type Interval = { startM: number; endM: number };

/** A worker candidate enriched with parsed availability */
export type MatchCandidate = {
  userId:      string;
  displayName: string;
  yearsExp:    number;
  photoUrl:    string | null;
  /** Worker’s declared profession (for tiered pricing pools). */
  profession:  string;
  /** day_of_week (0–6) → merged, sorted intervals */
  availability: Map<number, Interval[]>;
};

type Candidate = MatchCandidate;

// ─── Public Output Types ──────────────────────────────────────────────────────

export type WorkerAssignment = {
  userId:      string;
  displayName: string;
  yearsExp:    number;
  photoUrl:    string | null;
  /** The time window this worker covers on this day (HH:mm) */
  startTime:   string;
  endTime:     string;
};

export type DaySchedule = {
  /** YYYY-MM-DD */
  date:        string;
  dayOfWeek:   number;
  /** Ordered segments covering the full requested window */
  assignments: WorkerAssignment[];
  /** True if the full window is covered */
  covered:     boolean;
};

export type MatchResult = {
  /** Per-day breakdown */
  schedule:        DaySchedule[];
  /** Unique workers used across all days */
  totalWorkers:    number;
  /** True if every day is fully covered */
  fullyCovered:    boolean;
  candidateCount:  number;
  ringCellCount:   number;
};

// ─── Time Helpers ─────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function toHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function parseDbTime(t: string): number {
  // Handles "HH:MM" and "HH:MM:SS"
  const [h = '0', m = '0'] = t.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

// ─── Calendar Helpers ─────────────────────────────────────────────────────────

function dayOfWeekFromYmd(ymd: string): number {
  return new Date(
    Date.UTC(
      parseInt(ymd.slice(0, 4), 10),
      parseInt(ymd.slice(5, 7), 10) - 1,
      parseInt(ymd.slice(8, 10), 10),
    ),
  ).getUTCDay();
}

// ─── Interval Helpers ─────────────────────────────────────────────────────────

/** Merge overlapping/adjacent intervals, return sorted list */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startM - b.startM);
  const merged: Interval[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur  = merged[merged.length - 1]!;
    const next = sorted[i]!;
    if (next.startM <= cur.endM) {
      cur.endM = Math.max(cur.endM, next.endM);
    } else {
      merged.push({ ...next });
    }
  }
  return merged;
}

/**
 * Given merged intervals, return contiguous segments that cover [reqStart, reqEnd].
 * Returns null if the intervals cannot fully cover the window.
 *
 * Example:
 *   intervals  = [{ 540, 720 }, { 840, 1020 }]   (09–12, 14–17)
 *   reqStart   = 540 (09:00)
 *   reqEnd     = 1020 (17:00)
 *   → [{ 540, 720 }, { 840, 1020 }]  — two segments, with a gap 12–14
 *   → returns null because there's a gap
 *
 *   If intervals = [{ 540, 1020 }] → returns [{ 540, 1020 }] ✓
 */
function segmentsThatCover(
  intervals: Interval[],
  reqStart:  number,
  reqEnd:    number,
): Interval[] | null {
  if (reqEnd <= reqStart) return null;

  // Clip to the requested window
  const clipped = intervals
    .filter(iv => iv.endM > reqStart && iv.startM < reqEnd)
    .map(iv => ({ startM: Math.max(iv.startM, reqStart), endM: Math.min(iv.endM, reqEnd) }));

  if (clipped.length === 0) return null;

  // Check contiguous coverage — no gaps allowed for a single worker
  let cursor = reqStart;
  for (const iv of clipped) {
    if (iv.startM > cursor) return null; // gap
    cursor = Math.max(cursor, iv.endM);
  }

  return cursor >= reqEnd ? clipped : null;
}

/** True if this candidate's merged availability fully covers [reqStartM, reqEndM] on `dateYmd`. */
export function matchCandidateCoversWindow(
  candidate: MatchCandidate,
  dateYmd:   string,
  reqStartM: number,
  reqEndM:   number,
): boolean {
  const dow       = dayOfWeekFromYmd(dateYmd);
  const intervals = candidate.availability.get(dow) ?? [];
  return segmentsThatCover(intervals, reqStartM, reqEndM) !== null;
}

/**
 * First eligible worker (Firebase user id) who can solo-cover the window, excluding listed ids.
 * Reuses pool + tier filters from staff-request matching.
 */
export async function findReplacementUserIdForShiftWindow(params: {
  clientUserId:        string;
  dateYmd:             string;
  startHHmm:           string;
  endHHmm:             string;
  pricingTierId:       string;
  requestProfession:   string;
  requirements:        string[];
  excludeUserIds:      string[];
  dailyWindowsForPool: DailyWindowMatch[];
}): Promise<string | null> {
  const pool = await buildMatchCandidatePool({
    clientUserId: params.clientUserId,
    startDate:    params.dateYmd,
    endDate:      params.dateYmd,
    dailyWindows: params.dailyWindowsForPool,
  });
  if (!pool.ok) return null;

  let list = await filterCandidatesForPricingTier(
    pool.candidates,
    params.pricingTierId,
    params.requestProfession,
    params.requirements,
  );
  const ex = new Set(params.excludeUserIds);
  list = list.filter(c => !ex.has(c.userId));

  const reqStart = toMinutes(params.startHHmm);
  const reqEnd   = toMinutes(params.endHHmm);
  for (const c of list) {
    if (matchCandidateCoversWindow(c, params.dateYmd, reqStart, reqEnd)) return c.userId;
  }
  return null;
}

// ─── Availability Map Builder ─────────────────────────────────────────────────

function buildAvailabilityMap(rows: AvailabilitySlotRow[]): Map<string, Map<number, Interval[]>> {
  // userId → dayOfWeek → merged intervals
  const map = new Map<string, Map<number, Interval[]>>();

  for (const r of rows) {
    let byDay = map.get(r.user_id);
    if (!byDay) {
      byDay = new Map();
      map.set(r.user_id, byDay);
    }
    const list = byDay.get(r.day_of_week) ?? [];
    list.push({ startM: parseDbTime(r.start_time), endM: parseDbTime(r.end_time) });
    byDay.set(r.day_of_week, list);
  }

  // Merge all slots per user per day once
  for (const byDay of map.values()) {
    for (const [dow, slots] of byDay) {
      byDay.set(dow, mergeIntervals(slots));
    }
  }

  return map;
}

// ─── Core Scheduling Algorithm ────────────────────────────────────────────────

/**
 * Greedy interval-cover with fewest-workers preference.
 *
 * Strategy:
 *   1. Sort candidates by descending coverage length for this day (greedy largest-first).
 *   2. Walk the uncovered portion [cursor, reqEnd], pick the candidate whose
 *      interval starts at or before `cursor` and extends furthest.
 *   3. Repeat until covered or no progress.
 *
 * This is the classic "minimum number of intervals to cover a range" greedy —
 * O(n log n) per day, which is fine for the candidate pool sizes expected here.
 */
function scheduleDayWithMinWorkers(
  date:       string,
  dayOfWeek:  number,
  reqStart:   number,
  reqEnd:     number,
  candidates: Candidate[],
): DaySchedule {
  // Build (candidate, clipped interval) pairs for this day
  type Slot = { candidate: Candidate; startM: number; endM: number };

  const slots: Slot[] = [];
  for (const c of candidates) {
    const intervals = c.availability.get(dayOfWeek) ?? [];
    for (const iv of intervals) {
      if (iv.endM > reqStart && iv.startM < reqEnd) {
        slots.push({
          candidate: c,
          startM: Math.max(iv.startM, reqStart),
          endM:   Math.min(iv.endM,   reqEnd),
        });
      }
    }
  }

  // Sort by start time ascending, then by coverage length descending (greedy)
  slots.sort((a, b) => a.startM - b.startM || (b.endM - b.startM) - (a.endM - a.startM));

  const assignments: WorkerAssignment[] = [];
  let cursor = reqStart;

  while (cursor < reqEnd) {
    // Among slots that start at or before cursor, pick the one reaching furthest
    let bestSlot: Slot | null = null;
    for (const s of slots) {
      if (s.startM > cursor) break; // sorted, no point continuing
      if (s.endM > (bestSlot?.endM ?? cursor)) {
        bestSlot = s;
      }
    }

    if (!bestSlot) break; // gap — cannot cover further

    assignments.push({
      userId:      bestSlot.candidate.userId,
      displayName: bestSlot.candidate.displayName,
      yearsExp:    bestSlot.candidate.yearsExp,
      photoUrl:    bestSlot.candidate.photoUrl,
      startTime:   toHHmm(bestSlot.startM),
      endTime:     toHHmm(bestSlot.endM),
    });

    cursor = bestSlot.endM;

    // Remove used slot so we don't reuse the same worker+interval twice
    const idx = slots.indexOf(bestSlot);
    slots.splice(idx, 1);
  }

  return {
    date,
    dayOfWeek,
    assignments,
    covered: cursor >= reqEnd,
  };
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

function displayName(first: string, last: string): string {
  const initial = last.trim().charAt(0);
  return initial ? `${first.trim()} ${initial}.` : first.trim();
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export type DailyWindowMatch = {
  date:   string;
  slots:  { startTime: string; endTime: string }[];
};

/**
 * Loads the same candidate pool used for greedy matching (single round-trip batch
 * for workers + availability). Exposed for pricing-tier availability counts.
 */
export async function buildMatchCandidatePool(params: {
  clientUserId: string;
  startDate:    string;
  endDate:      string | null;
  dailyWindows: DailyWindowMatch[];
}): Promise<
  | { ok: false; ringCellCount: number }
  | { ok: true; ringCellCount: number; candidates: MatchCandidate[] }
> {
  const fail = (ringCellCount = 0) => ({ ok: false as const, ringCellCount });

  const { data: clientLoc, error: locErr } = await supabase
    .from('locations')
    .select('lat, lng, cell_id')
    .eq('user_id', params.clientUserId)
    .single();

  if (locErr || !clientLoc) return fail();

  const ring          = getCellsInRing(clientLoc.lat, clientLoc.lng, H3_K);
  const ringCellCount = ring.length;

  if (ring.length === 0) return fail(0);

  const { data: gridRows, error: gridErr } = await supabase
    .from('workers_cell_grid')
    .select('worker_id')
    .in('cell_id', ring);

  if (gridErr || !gridRows?.length) return fail(ringCellCount);

  const workerIdsInRing = new Set(gridRows.map(r => r.worker_id));
  if (workerIdsInRing.size === 0) return fail(ringCellCount);

  const { data: workerRows, error: wErr } = await supabase
    .from('workers')
    .select('id, user_id, first_name, last_name, photo_url, years_exp, status, profession')
    .in('id', Array.from(workerIdsInRing));

  if (wErr || !workerRows?.length) return fail(ringCellCount);

  const workerUserIds = workerRows.map(w => w.user_id);

  const { data: userRows } = await supabase
    .from('users')
    .select('id, is_active, role')
    .in('id', workerUserIds)
    .eq('role', 'worker') satisfies { data: Pick<UserRow, 'id' | 'is_active' | 'role'>[] | null };

  const activeUserIds = new Set(
    (userRows ?? []).filter(u => u.is_active !== false).map(u => u.id),
  );

  const calendarDays = enumerateCalendarDays(params.startDate, params.endDate);
  const uniqueDows   = [...new Set(calendarDays.map(dayOfWeekFromYmd))];

  const { data: availRows } = await supabase
    .from('availability')
    .select('user_id, day_of_week, start_time, end_time')
    .in('user_id', workerUserIds)
    .in('day_of_week', uniqueDows);

  const availMap = buildAvailabilityMap(availRows ?? []);

  const candidates: MatchCandidate[] = [];

  for (const w of workerRows) {
    if (!activeUserIds.has(w.user_id)) continue;
    if (w.status && w.status.toLowerCase() === 'inactive') continue;
    const byDay = availMap.get(w.user_id);
    if (!byDay || byDay.size === 0) continue;

    candidates.push({
      userId:       w.user_id,
      displayName:  displayName(w.first_name, w.last_name),
      yearsExp:     w.years_exp,
      photoUrl:     w.photo_url ?? null,
      profession:   w.profession,
      availability: byDay,
    });
  }

  candidates.sort((a, b) => b.yearsExp - a.yearsExp);

  return { ok: true, ringCellCount, candidates };
}

async function verifiedCertNamesByUser(userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  const { data } = await supabase
    .from('certifications')
    .select('user_id, name')
    .in('user_id', userIds)
    .eq('is_verified', true);
  for (const row of data ?? []) {
    const list = map.get(row.user_id) ?? [];
    list.push(row.name.toLowerCase());
    map.set(row.user_id, list);
  }
  return map;
}

function certsSatisfyRequirements(certNames: string[], requirements: string[]): boolean {
  if (requirements.length === 0) return false;
  return requirements.some(req =>
    certNames.some(n => n.includes(req) || req.includes(n)),
  );
}

/**
 * Restricts the greedy pool to the workers eligible for the selected pricing tier.
 * Must stay in sync with {@link buildPricingTierOffersForJob}.
 */
export async function filterCandidatesForPricingTier(
  all:       MatchCandidate[],
  tierId:    string,
  jobProfession: string,
  requirements: string[],
): Promise<MatchCandidate[]> {
  if (tierId === PRICING_TIER_STANDARD) return all;

  if (tierId === PRICING_TIER_SAME_PROFESSION) {
    const p = jobProfession.trim().toLowerCase();
    if (p.length === 0 || p === 'unspecified') return [];
    return all.filter(c => c.profession.trim().toLowerCase() === p);
  }

  if (tierId === PRICING_TIER_CREDENTIALED) {
    const req = requirements.map(r => r.trim().toLowerCase()).filter(Boolean);
    if (req.length === 0) return [];
    const certMap = await verifiedCertNamesByUser(all.map(c => c.userId));
    return all.filter(c => certsSatisfyRequirements(certMap.get(c.userId) ?? [], req));
  }

  return all;
}

export async function matchWorkersForStaffRequest(params: {
  clientUserId: string;
  startDate:    string; // YYYY-MM-DD
  endDate:      string | null;
  dailyWindows: DailyWindowMatch[];
  pricingTierId?: string | null;
  requestProfession?: string;
  requirements?: string[];
}): Promise<MatchResult> {
  const empty = (ringCellCount = 0): MatchResult => ({
    schedule:       [],
    totalWorkers:   0,
    fullyCovered:   false,
    candidateCount: 0,
    ringCellCount,
  });

  const pool = await buildMatchCandidatePool(params);
  if (!pool.ok) return empty(pool.ringCellCount);

  const tierId = params.pricingTierId ?? PRICING_TIER_STANDARD;
  let candidates = await filterCandidatesForPricingTier(
    pool.candidates,
    tierId,
    params.requestProfession ?? '',
    params.requirements ?? [],
  );

  const { ringCellCount } = pool;

  const calendarDays = enumerateCalendarDays(params.startDate, params.endDate);

  // ── 6. Schedule each day ──────────────────────────────────────────────────

  const byDate = new Map(params.dailyWindows.map(w => [w.date, w]));

  const schedule: DaySchedule[] = calendarDays.map(date => {
    const dow = dayOfWeekFromYmd(date);
    const plan = byDate.get(date);
    const slots = plan?.slots;
    if (!slots?.length) {
      return {
        date,
        dayOfWeek: dow,
        assignments: [],
        covered:     false,
      };
    }

    const assignments: WorkerAssignment[] = [];
    let covered = true;

    for (const slot of slots) {
      const part = scheduleDayWithMinWorkers(
        date,
        dow,
        toMinutes(slot.startTime),
        toMinutes(slot.endTime),
        candidates,
      );
      assignments.push(...part.assignments);
      covered = covered && part.covered;
    }

    return {
      date,
      dayOfWeek: dow,
      assignments,
      covered,
    };
  });

  // ── 7. Summarise ──────────────────────────────────────────────────────────

  const allWorkerIds = new Set(
    schedule.flatMap(d => d.assignments.map(a => a.userId)),
  );

  return {
    schedule,
    totalWorkers:   allWorkerIds.size,
    fullyCovered:   schedule.every(d => d.covered),
    candidateCount: candidates.length,
    ringCellCount,
  };
}