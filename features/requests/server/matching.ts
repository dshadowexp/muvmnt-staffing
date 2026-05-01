import "server-only";

import { gridDiskDistances } from "h3-js";
import { createAdminClient } from "@/supabase/server";
import { H3_K } from "@/lib/constants";
import {
    PRICING_TIER_CREDENTIALED,
    PRICING_TIER_PULSE,
    PRICING_TIER_VETERAN,
    PRICING_TIER_VETTED,
} from "../constants";
import { normalizeProfessionId } from "@/lib/professions";
import { wallClockShiftToUtcRange } from "@/features/shifts/lib/wall-clock-shift-range";

/**
 * In-memory time interval (minutes since midnight). All time math runs in
 * minutes so we never deal with Date drift / TZ inside the algorithm.
 */
type Interval = { startM: number; endM: number };

export type MatchCandidate = {
    userId: string;
    displayName: string;
    yearsExp: number;
    photoUrl: string | null;
    profession: string;
    autoConfirm: boolean;
    ratingAvg: number | null;
    /** day_of_week (0–6) → merged & sorted intervals. */
    availability: Map<number, Interval[]>;
};

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

export type MatchResult = {
    schedule: DaySchedule[];
    totalWorkers: number;
    fullyCovered: boolean;
    candidateCount: number;
    ringCellCount: number;
};

export type DailyWindowMatch = {
    date: string;
    slots: { startTime: string; endTime: string }[];
};

// ─── Emptys ────────────────────────────────────────────────────────────
export const emptyMatchResult: MatchResult = {
    schedule: [],
    totalWorkers: 0,
    fullyCovered: false,
    candidateCount: 0,
    ringCellCount: 0,
};

// ─── Time helpers ────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
    const [h = "0", m = "0"] = hhmm.split(":");
    return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function toHHmm(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}

function parseDbTime(t: string): number {
    const [h = "0", m = "0"] = t.split(":");
    return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function dayOfWeekFromYmd(ymd: string): number {
    return new Date(
        Date.UTC(
            parseInt(ymd.slice(0, 4), 10),
            parseInt(ymd.slice(5, 7), 10) - 1,
            parseInt(ymd.slice(8, 10), 10),
        ),
    ).getUTCDay();
}

function mergeIntervals(intervals: Interval[]): Interval[] {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.startM - b.startM);
    const merged: Interval[] = [{ ...sorted[0]! }];
    for (let i = 1; i < sorted.length; i++) {
        const cur = merged[merged.length - 1]!;
        const next = sorted[i]!;
        if (next.startM <= cur.endM) {
            cur.endM = Math.max(cur.endM, next.endM);
        } else {
            merged.push({ ...next });
        }
    }
    return merged;
}

function uniqueDayOfWeekFromDailyWindows(
    windows: DailyWindowMatch[],
): number[] {
    const dows = windows
      .filter((w) => w.slots?.length)
      .map((w) => dayOfWeekFromYmd(w.date.slice(0, 10)));
    return [...new Set(dows)];
}

function buildAvailabilityMap(
    rows: { user_id: string; day_of_week: number; start_time: string; end_time: string }[],
): Map<string, Map<number, Interval[]>> {
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
    for (const byDay of map.values()) {
        for (const [dow, slots] of byDay) {
            byDay.set(dow, mergeIntervals(slots));
        }
    }
    return map;
}

function displayName(first: string, last: string): string {
    const initial = last.trim().charAt(0);
    return initial ? `${first.trim()} ${initial}.` : first.trim();
}

// ─── Public types ────────────────────────────────────────────────────────────

export type MatchProgressEvent =
    | { kind: "locating"; cellId: string | null }
    | { kind: "ring"; ringCellCount: number }
    | { kind: "workers"; workerCount: number }
    | { kind: "availability"; availabilityRows: number }
    | { kind: "filter"; tierId: string; remaining: number; before: number }
    | { kind: "scheduling"; days: number }
    | { kind: "expanding"; ringIndex: number; totalRings: number }
    | { kind: "done"; result: MatchResult };

export type ProgressFn = (event: MatchProgressEvent) => void | Promise<void>;

// ─── Pool builder ────────────────────────────────────────────────────────────

export type CandidatePool =
    | { ok: false; }
    | { ok: true; candidates: MatchCandidate[] };

export async function buildCandidatePool(params: {
    dailyWindows: DailyWindowMatch[];
    ring: string[];
    progress?: ProgressFn;
}): Promise<CandidatePool> {
    const supabase = await createAdminClient();
    const fail = (ringCellCount = 0) => ({ ok: false as const, ringCellCount });
    
    await params.progress?.({ kind: "ring", ringCellCount: params.ring.length });
    if (params.ring.length === 0) return fail(0);

    const { data: workerRows } = await supabase
        .from("workers")
        .select("id, user_id, first_name, last_name, photo_url, years_exp, profession, auto_confirm, rating_avg, rating_count")
        .in("cell_id", params.ring)
        .eq("stage", "live");

    await params.progress?.({ kind: "workers", workerCount: workerRows?.length ?? 0 });
    if (!workerRows?.length) return fail(params.ring.length);

    const activeWorkerUserIds = new Set((workerRows ?? []).map((u) => u.user_id));

    const uniqueDows = uniqueDayOfWeekFromDailyWindows(params.dailyWindows);
    if (uniqueDows.length === 0) return fail(params.ring.length);

    const { data: availRows } = await supabase
        .from("availability")
        .select("user_id, day_of_week, start_time, end_time")
        .in("user_id", Array.from(activeWorkerUserIds))
        .in("day_of_week", uniqueDows);

    await params.progress?.({
        kind: "availability",
        availabilityRows: availRows?.length ?? 0,
    });

    const availMap = buildAvailabilityMap(availRows ?? []);

    const candidates: MatchCandidate[] = [];
    for (const w of workerRows) {
        const byDay = availMap.get(w.user_id);
        if (!byDay || byDay.size === 0) continue;
        candidates.push({
            userId: w.user_id,
            displayName: displayName(w.first_name, w.last_name),
            yearsExp: w.years_exp,
            photoUrl: w.photo_url ?? null,
            profession: w.profession,
            availability: byDay,
            autoConfirm: w.auto_confirm,
            ratingAvg: w.rating_avg
        });
    }
    candidates.sort((a, b) => b.yearsExp - a.yearsExp);

    return { ok: true, candidates };
}

// ─── Tier filtering ──────────────────────────────────────────────────────────

async function verifiedCertNamesByUser(
    userIds: string[],
): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (userIds.length === 0) return map;
    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("compliances")
        .select("user_id, name")
        .in("user_id", userIds)
        .eq("is_verified", true);
    for (const row of data ?? []) {
        const list = map.get(row.user_id) ?? [];
        list.push(row.name.toLowerCase());
        map.set(row.user_id, list);
    }
    return map;
}

function certsSatisfy(certNames: string[], requirements: string[]): boolean {
    if (requirements.length === 0) return false;
    const verified = new Set(certNames);
    return requirements.every((req) => verified.has(req));
}

/**
 * Tier → candidate pool filter.
 *
 * Dynamic-pricing tiers (`pulse`, `vetted`, `veteran`, `reserve`) are quoted
 * **independently** of which workers are around — pricing is the user-facing
 * lever, the pool is the matching lever. Right now we accept all near-by,
 * available workers for every dynamic tier; tier-specific filtering will
 * land once the worker model has explicit "vetted / veteran / reserve" flags
 * (see follow-ups in pricing.ts). The legacy tier IDs continue to filter so
 * existing rows keep behaving the way they always did.
 */
export async function filterCandidatesForTier(
    all: MatchCandidate[],
    tierId: string,
    profession: string,
    requirements: string[],
): Promise<MatchCandidate[]> {
    switch (tierId) {
        case PRICING_TIER_PULSE:
            return all;
        case PRICING_TIER_VETTED: {
            if (!profession.trim()) return [];
            const p = normalizeProfessionId(profession);
            return all.filter(
                (c) => normalizeProfessionId(c.profession) === p,
            );
        }
        case PRICING_TIER_VETERAN: {
            return all.filter((c) => c.yearsExp >= 3);
        }   
        case PRICING_TIER_CREDENTIALED: {
            const reqs = requirements
                .map((r) => r.trim().toLowerCase())
                .filter(Boolean);
            if (reqs.length === 0) return [];
            const certs = await verifiedCertNamesByUser(all.map((c) => c.userId));
            return all.filter((c) =>
                certsSatisfy(certs.get(c.userId) ?? [], reqs),
            );
        }
        default:
            return all;
    }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Compute H3 ring layers from a cell id. Single import point for h3-js. */
function buildRings(cellId: string): string[][] {
    return gridDiskDistances(cellId, H3_K);
}

/**
 * Resolve a filtered, sorted candidate list for one H3 ring slice.
 * Handles pool building, tier/profession/requirements filtering, and optional
 * user exclusions. Emits "filter" progress when a progress callback is provided.
 */
async function resolveCandidatesForRing(params: {
    ring: string[];
    dailyWindows: DailyWindowMatch[];
    pricingTierId: string;
    profession: string;
    requirements: string[];
    excludeUserIds?: string[];
    progress?: ProgressFn;
}): Promise<MatchCandidate[]> {
    const pool = await buildCandidatePool({
        dailyWindows: params.dailyWindows,
        ring: params.ring,
        progress: params.progress,
    });

    const all = pool.ok ? pool.candidates : [];
    const filtered = await filterCandidatesForTier(
        all,
        params.pricingTierId,
        params.profession,
        params.requirements,
    );

    await params.progress?.({
        kind: "filter",
        tierId: params.pricingTierId,
        remaining: filtered.length,
        before: all.length,
    });

    if (!params.excludeUserIds?.length) return filtered;
    const excluded = new Set(params.excludeUserIds);
    return filtered.filter((c) => !excluded.has(c.userId));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type RunScheduleMatchParams = {
    cellId: string;
    dailyWindows: DailyWindowMatch[];
    pricingTierId: string;
    profession: string;
    requirements: string[];
    progress?: ProgressFn;
};

/**
 * Progressive ring-expansion scheduler. Starts from the cell closest to the
 * request location and expands outward until full coverage is achieved or all
 * rings are exhausted.
 *
 * Emits rich progress events: detailed sub-steps (ring / workers / availability
 * / filter / scheduling) on the first ring, then "expanding" events on
 * subsequent rings so the UI can show "Expanding search radius…" without
 * visually regressing already-completed step rows.
 */
export async function runScheduleMatch(
    params: RunScheduleMatchParams,
): Promise<MatchResult> {
    const rings = buildRings(params.cellId);

    await params.progress?.({ kind: "locating", cellId: params.cellId });

    let result: MatchResult = emptyMatchResult;

    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i]!;

        // Subsequent rings: emit a single "expanding" event instead of replaying
        // ring/workers/availability steps (which would visually reset step rows).
        if (i > 0) {
            await params.progress?.({
                kind: "expanding",
                ringIndex: i,
                totalRings: rings.length,
            });
        }

        // Only stream detailed sub-events on the first ring pass.
        const ringProgress = i === 0 ? params.progress : undefined;

        const candidates = await resolveCandidatesForRing({
            ring,
            dailyWindows: params.dailyWindows,
            pricingTierId: params.pricingTierId,
            profession: params.profession,
            requirements: params.requirements,
            progress: ringProgress,
        });

        result = await matchWorkersForStaffRequest({
            ring,
            dailyWindows: params.dailyWindows,
            pricingTierId: params.pricingTierId,
            profession: params.profession,
            requirements: params.requirements,
            progress: ringProgress,
            filteredCandidates: candidates,
            existingMatchResult: result,
        });

        // First ring only: emit "scheduling" so the UI shows "building plan" before
        // outer-ring "expanding" events (same step key, different labels).
        if (i === 0) {
            const distinctDays = new Set(
                params.dailyWindows
                    .filter((w) => w.slots?.length)
                    .map((w) => w.date.slice(0, 10)),
            ).size;
            await params.progress?.({
                kind: "scheduling",
                days: Math.max(1, distinctDays),
            });
        }

        if (result.fullyCovered) break;
    }

    return result;
}

export type FindFirstAvailableWorkerParams = {
    cellId: string;
    dateYmd: string;
    startHHmm: string;
    endHHmm: string;
    pricingTierId: string;
    profession: string;
    requirements: string[];
    excludeUserIds?: string[];
};

/**
 * Find the first available worker who can solo-cover a single shift window.
 *
 * Uses all H3 rings at once (broadest search) since replacement urgency
 * outweighs proximity preference. Applies the same tier / profession /
 * requirements / exclusion filters as the full scheduler.
 *
 * Replaces the old `findReplacementUserIdForShiftWindow` — callers now pass
 * `cellId` instead of a pre-built ring, keeping H3 details internal.
 */
/** Workers already booked for an overlapping interval (same wall-clock window semantics as shifts storage). */
async function userIdsWithShiftTimeOverlap(
    startIso: string,
    endIso: string,
): Promise<string[]> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("shifts")
        .select("worker_id")
        .not("worker_id", "is", null)
        .in("status", ["scheduled", "confirmed", "in_progress"])
        .lt("start_time", endIso)
        .gt("end_time", startIso);

    if (error || !data?.length) return [];

    const workerPkIds = [
        ...new Set(
            data
                .map((r) => r.worker_id)
                .filter((id): id is string => typeof id === "string"),
        ),
    ];
    if (workerPkIds.length === 0) return [];

    const { data: workers, error: wErr } = await supabase
        .from("workers")
        .select("user_id")
        .in("id", workerPkIds);

    if (wErr || !workers?.length) return [];
    return [...new Set(workers.map((w) => w.user_id))];
}

/** Drop candidates who already have another shift overlapping this wall-clock window. */
async function filterCandidatesExcludingShiftOverlap(
    candidates: MatchCandidate[],
    dateYmd: string,
    startHHmm: string,
    endHHmm: string,
): Promise<MatchCandidate[]> {
    const { startIso, endIso } = wallClockShiftToUtcRange(
        dateYmd.slice(0, 10),
        startHHmm,
        endHHmm,
    );
    const busy = await userIdsWithShiftTimeOverlap(startIso, endIso);
    if (busy.length === 0) return candidates;
    const busySet = new Set(busy);
    return candidates.filter((c) => !busySet.has(c.userId));
}

export async function findFirstAvailableWorker(
    params: FindFirstAvailableWorkerParams,
): Promise<string | null> {
    const allCells = buildRings(params.cellId).flat();

    const dailyWindows: DailyWindowMatch[] = [{
        date: params.dateYmd.slice(0, 10),
        slots: [{ startTime: params.startHHmm, endTime: params.endHHmm }],
    }];

    const { startIso, endIso } = wallClockShiftToUtcRange(
        params.dateYmd.slice(0, 10),
        params.startHHmm,
        params.endHHmm,
    );

    const busyOverlap = await userIdsWithShiftTimeOverlap(startIso, endIso);
    const excludeUserIds = [
        ...new Set([...(params.excludeUserIds ?? []), ...busyOverlap]),
    ];

    const candidates = await resolveCandidatesForRing({
        ring: allCells,
        dailyWindows,
        pricingTierId: params.pricingTierId,
        profession: params.profession,
        requirements: params.requirements,
        excludeUserIds,
    });

    const reqStart = toMinutes(params.startHHmm);
    const reqEnd   = toMinutes(params.endHHmm);
    const dow      = dayOfWeekFromYmd(params.dateYmd);

    for (const c of candidates) {
        const intervals = c.availability.get(dow) ?? [];
        if (segmentsThatCover(intervals, reqStart, reqEnd)) return c.userId;
    }
    return null;
}

function segmentsThatCover(
    intervals: Interval[],
    reqStart: number,
    reqEnd: number,
): Interval[] | null {
    if (reqEnd <= reqStart) return null;
    const clipped = intervals
        .filter((iv) => iv.endM > reqStart && iv.startM < reqEnd)
        .map((iv) => ({
            startM: Math.max(iv.startM, reqStart),
            endM: Math.min(iv.endM, reqEnd),
        }));
    if (clipped.length === 0) return null;
    let cursor = reqStart;
    for (const iv of clipped) {
        if (iv.startM > cursor) return null;
        cursor = Math.max(cursor, iv.endM);
    }
    return cursor >= reqEnd ? clipped : null;
}

// ─── Greedy day scheduler ────────────────────────────────────────────────────

function scheduleDayWithMinWorkers(
    date: string,
    dayOfWeek: number,
    reqStart: number,
    reqEnd: number,
    candidates: MatchCandidate[],
): DaySchedule {
    type Slot = { candidate: MatchCandidate; startM: number; endM: number };
    const slots: Slot[] = [];
    for (const c of candidates) {
        const intervals = c.availability.get(dayOfWeek) ?? [];
        for (const iv of intervals) {
            if (iv.endM > reqStart && iv.startM < reqEnd) {
                slots.push({
                    candidate: c,
                    startM: Math.max(iv.startM, reqStart),
                    endM: Math.min(iv.endM, reqEnd),
                });
            }
        }
    }
    // Sort by start ascending, then by length descending.
    slots.sort(
        (a, b) =>
            a.startM - b.startM || (b.endM - b.startM) - (a.endM - a.startM),
    );

    const assignments: WorkerAssignment[] = [];
    let cursor = reqStart;
    while (cursor < reqEnd) {
        let best: Slot | null = null;
        for (const s of slots) {
            if (s.startM > cursor) break;
            if (s.endM > (best?.endM ?? cursor)) best = s;
        }
        if (!best) break;
        assignments.push({
            userId: best.candidate.userId,
            displayName: best.candidate.displayName,
            yearsExp: best.candidate.yearsExp,
            photoUrl: best.candidate.photoUrl,
            startTime: toHHmm(best.startM),
            endTime: toHHmm(best.endM),
        });
        cursor = best.endM;
        slots.splice(slots.indexOf(best), 1);
    }

    return { date, dayOfWeek, assignments, covered: cursor >= reqEnd };
}

// ─── Public match entry-point ────────────────────────────────────────────────

export type MatchInput = {
    ring: string[];
    dailyWindows: DailyWindowMatch[];
    pricingTierId: string;
    profession: string;
    requirements: string[];
    progress?: ProgressFn;
    filteredCandidates: MatchCandidate[];
    existingMatchResult: MatchResult;
};

export async function matchWorkersForStaffRequest(
    input: MatchInput,
): Promise<MatchResult> {
    const candidates = input.filteredCandidates;
    const existing = input.existingMatchResult;

    // Build a mutable copy of the existing schedule keyed by date
    const scheduleByDate = new Map<string, DaySchedule>(
        existing.schedule.map((d) => [d.date, { ...d, assignments: [...d.assignments] }])
    );

    const byDate = new Map(input.dailyWindows.map((w) => [w.date, w]));
    const calendarDays = [
        ...new Set(
            input.dailyWindows
                .filter((w) => w.slots?.length)
                .map((w) => w.date.slice(0, 10)),
        ),
    ].sort();

    for (const date of calendarDays) {
        const existingDay = scheduleByDate.get(date);

        // Skip days already fully covered
        if (existingDay?.covered) continue;

        const dow = dayOfWeekFromYmd(date);
        const plan = byDate.get(date);
        if (!plan?.slots?.length) continue;

        const assignments: WorkerAssignment[] = [];
        let covered = true;

        for (const slot of plan.slots) {
            const reqStart = toMinutes(slot.startTime);
            const reqEnd   = toMinutes(slot.endTime);

            const candidatesForSlot = await filterCandidatesExcludingShiftOverlap(
                candidates,
                date,
                slot.startTime,
                slot.endTime,
            );

            // Existing assignments for this slot (from prior rings)
            const priorAssignments = (existingDay?.assignments ?? []).filter(
                (a) => toMinutes(a.startTime) >= reqStart && toMinutes(a.endTime) <= reqEnd
            );

            const improved = improveSlotCoverage(
                date,
                dow,
                reqStart,
                reqEnd,
                priorAssignments,
                candidatesForSlot,
            );

            assignments.push(...improved.assignments);
            covered = covered && improved.covered;
        }

        scheduleByDate.set(date, { date, dayOfWeek: dow, assignments, covered });
    }

    // Days from existing result that weren't in this ring's dailyWindows stay as-is
    for (const day of existing.schedule) {
        if (!scheduleByDate.has(day.date)) {
            scheduleByDate.set(day.date, day);
        }
    }

    const schedule = calendarDays
        .map((d) => scheduleByDate.get(d)!)
        .filter(Boolean);

    const allWorkerIds = new Set(
        schedule.flatMap((d) => d.assignments.map((a) => a.userId))
    );

    return {
        schedule,
        totalWorkers: allWorkerIds.size,
        fullyCovered: schedule.every((d) => d.covered),
        candidateCount: existing.candidateCount + candidates.length,
        ringCellCount: input.ring.length,
    };
}

function improveSlotCoverage(
    date: string,
    dayOfWeek: number,
    reqStart: number,
    reqEnd: number,
    priorAssignments: WorkerAssignment[],
    newCandidates: MatchCandidate[],
): { assignments: WorkerAssignment[]; covered: boolean } {

    // Build a mutable list of the best assignment per gap
    // Represent coverage as a list of filled segments
    type Segment = { startM: number; endM: number; assignment: WorkerAssignment };

    const segments: Segment[] = priorAssignments.map((a) => ({
        startM: toMinutes(a.startTime),
        endM:   toMinutes(a.endTime),
        assignment: a,
    }));

    // Build candidate slots from new ring
    type CandidateSlot = { candidate: MatchCandidate; startM: number; endM: number };
    const candidateSlots: CandidateSlot[] = [];
    for (const c of newCandidates) {
        const intervals = c.availability.get(dayOfWeek) ?? [];
        for (const iv of intervals) {
            if (iv.endM > reqStart && iv.startM < reqEnd) {
                candidateSlots.push({
                    candidate: c,
                    startM: Math.max(iv.startM, reqStart),
                    endM:   Math.min(iv.endM, reqEnd),
                });
            }
        }
    }
    // Longest coverage first — maximises replacement value
    candidateSlots.sort((a, b) => (b.endM - b.startM) - (a.endM - a.startM));

    for (const cs of candidateSlots) {
        // Check if this candidate replaces any existing segment with a longer one
        const dominated = segments.filter(
            (s) =>
                s.startM >= cs.startM &&
                s.endM   <= cs.endM   &&
                (cs.endM - cs.startM) > (s.endM - s.startM),
        );

        if (dominated.length > 0) {
            // Remove all segments this new candidate fully covers and does better
            for (const d of dominated) {
                segments.splice(segments.indexOf(d), 1);
            }
            segments.push({
                startM: cs.startM,
                endM:   cs.endM,
                assignment: {
                    userId:      cs.candidate.userId,
                    displayName: cs.candidate.displayName,
                    yearsExp:    cs.candidate.yearsExp,
                    photoUrl:    cs.candidate.photoUrl,
                    startTime:   toHHmm(cs.startM),
                    endTime:     toHHmm(cs.endM),
                },
            });
            continue;
        }

        // Otherwise check if this fills a gap
        const gaps = findGaps(segments, reqStart, reqEnd);
        for (const gap of gaps) {
            if (cs.startM <= gap.startM && cs.endM > gap.startM) {
                segments.push({
                    startM: cs.startM,
                    endM:   cs.endM,
                    assignment: {
                        userId:      cs.candidate.userId,
                        displayName: cs.candidate.displayName,
                        yearsExp:    cs.candidate.yearsExp,
                        photoUrl:    cs.candidate.photoUrl,
                        startTime:   toHHmm(cs.startM),
                        endTime:     toHHmm(cs.endM),
                    },
                });
                break;
            }
        }
    }

    // Run greedy cover pass to pick minimum segments that cover reqStart→reqEnd
    segments.sort((a, b) => a.startM - b.startM || (b.endM - b.startM) - (a.endM - a.startM));

    const chosen: Segment[] = [];
    let cursor = reqStart;
    while (cursor < reqEnd) {
        let best: Segment | null = null;
        for (const s of segments) {
            if (s.startM > cursor) break;
            if (s.endM > (best?.endM ?? cursor)) best = s;
        }
        if (!best) break;
        chosen.push(best);
        cursor = best.endM;
    }

    return {
        assignments: chosen.map((s) => s.assignment),
        covered: cursor >= reqEnd,
    };
}

function findGaps(
    segments: { startM: number; endM: number }[],
    reqStart: number,
    reqEnd: number,
): { startM: number; endM: number }[] {
    const sorted = [...segments].sort((a, b) => a.startM - b.startM);
    const gaps: { startM: number; endM: number }[] = [];
    let cursor = reqStart;
    for (const s of sorted) {
        if (s.startM > cursor) gaps.push({ startM: cursor, endM: s.startM });
        cursor = Math.max(cursor, s.endM);
    }
    if (cursor < reqEnd) gaps.push({ startM: cursor, endM: reqEnd });
    return gaps;
}