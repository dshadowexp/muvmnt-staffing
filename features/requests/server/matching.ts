import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import { getCellsInRing } from "@/services/h3/client";
import { enumerateCalendarDays } from "./calendar-days";
import {
    PRICING_TIER_CREDENTIALED,
    PRICING_TIER_PULSE,
    PRICING_TIER_RESERVE,
    PRICING_TIER_SAME_PROFESSION,
    PRICING_TIER_STANDARD,
    PRICING_TIER_VETERAN,
    PRICING_TIER_VETTED,
} from "../constants";

const H3_K = 5;

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
    | { kind: "done"; result: MatchResult };

export type ProgressFn = (event: MatchProgressEvent) => void | Promise<void>;

// ─── Pool builder ────────────────────────────────────────────────────────────

export type CandidatePool =
    | { ok: false; ringCellCount: number }
    | { ok: true; ringCellCount: number; candidates: MatchCandidate[] };

export async function buildCandidatePool(params: {
    clientUserId: string;
    startDate: string;
    endDate: string | null;
    progress?: ProgressFn;
}): Promise<CandidatePool> {
    const supabase = await createAdminClient();
    const fail = (ringCellCount = 0) => ({ ok: false as const, ringCellCount });

    const { data: clientLoc } = await supabase
        .from("locations")
        .select("lat, lng")
        .eq("user_id", params.clientUserId)
        .single();

    if (!clientLoc) return fail();

    await params.progress?.({ kind: "locating", cellId: `${clientLoc.lat},${clientLoc.lng}` });

    const ring = getCellsInRing(clientLoc.lat, clientLoc.lng, H3_K);
    await params.progress?.({ kind: "ring", ringCellCount: ring.length });
    if (ring.length === 0) return fail(0);

    const { data: gridRows } = await supabase
        .from("workers_cell_grid")
        .select("worker_id")
        .in("cell_id", ring);

    const workerIds = new Set((gridRows ?? []).map((r) => r.worker_id));
    if (workerIds.size === 0) {
        await params.progress?.({ kind: "workers", workerCount: 0 });
        return fail(ring.length);
    }

    const { data: workerRows } = await supabase
        .from("workers")
        .select("id, user_id, first_name, last_name, photo_url, years_exp, status, profession")
        .in("id", Array.from(workerIds));

    await params.progress?.({ kind: "workers", workerCount: workerRows?.length ?? 0 });
    if (!workerRows?.length) return fail(ring.length);

    const workerUserIds = workerRows.map((w) => w.user_id);

    const { data: userRows } = await supabase
        .from("users")
        .select("id, is_active, role")
        .in("id", workerUserIds)
        .eq("role", "worker");

    const activeUserIds = new Set(
        (userRows ?? [])
            .filter((u) => u.is_active !== false)
            .map((u) => u.id),
    );

    const calendarDays = enumerateCalendarDays(params.startDate, params.endDate);
    const uniqueDows = [...new Set(calendarDays.map(dayOfWeekFromYmd))];

    const { data: availRows } = await supabase
        .from("availability")
        .select("user_id, day_of_week, start_time, end_time")
        .in("user_id", workerUserIds)
        .in("day_of_week", uniqueDows);

    await params.progress?.({
        kind: "availability",
        availabilityRows: availRows?.length ?? 0,
    });

    const availMap = buildAvailabilityMap(availRows ?? []);

    const candidates: MatchCandidate[] = [];
    for (const w of workerRows) {
        if (!activeUserIds.has(w.user_id)) continue;
        if (w.status && w.status.toLowerCase() === "inactive") continue;
        const byDay = availMap.get(w.user_id);
        if (!byDay || byDay.size === 0) continue;
        candidates.push({
            userId: w.user_id,
            displayName: displayName(w.first_name, w.last_name),
            yearsExp: w.years_exp,
            photoUrl: w.photo_url ?? null,
            profession: w.profession,
            availability: byDay,
        });
    }
    candidates.sort((a, b) => b.yearsExp - a.yearsExp);

    return { ok: true, ringCellCount: ring.length, candidates };
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
    return requirements.some((req) =>
        certNames.some((n) => n.includes(req) || req.includes(n)),
    );
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
        case PRICING_TIER_VETTED:
        case PRICING_TIER_VETERAN:
        case PRICING_TIER_RESERVE:
        case PRICING_TIER_STANDARD:
            return all;
        case PRICING_TIER_SAME_PROFESSION: {
            const p = profession.trim().toLowerCase();
            if (p.length === 0 || p === "unspecified") return [];
            return all.filter((c) => c.profession.trim().toLowerCase() === p);
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

/**
 * Single-worker re-match: returns the first eligible user id who can solo-cover
 * `[startHHmm, endHHmm]` on `dateYmd`, after applying the same near-by pool +
 * tier filters used by initial matching. Used by the shift transfer / decline
 * flows to swap in a replacement when a worker drops a confirmed shift.
 */
export async function findReplacementUserIdForShiftWindow(params: {
    clientUserId: string;
    dateYmd: string;
    startHHmm: string;
    endHHmm: string;
    pricingTierId: string;
    requestProfession: string;
    requirements: string[];
    excludeUserIds: string[];
}): Promise<string | null> {
    const pool = await buildCandidatePool({
        clientUserId: params.clientUserId,
        startDate: params.dateYmd,
        endDate: params.dateYmd,
    });
    if (!pool.ok) return null;

    let list = await filterCandidatesForTier(
        pool.candidates,
        params.pricingTierId,
        params.requestProfession,
        params.requirements,
    );
    const ex = new Set(params.excludeUserIds);
    list = list.filter((c) => !ex.has(c.userId));

    const reqStart = toMinutes(params.startHHmm);
    const reqEnd = toMinutes(params.endHHmm);
    for (const c of list) {
        const dow = dayOfWeekFromYmd(params.dateYmd);
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
    clientUserId: string;
    startDate: string;
    endDate: string | null;
    dailyWindows: DailyWindowMatch[];
    pricingTierId: string;
    profession: string;
    requirements: string[];
    progress?: ProgressFn;
    /** Reuse a pre-built pool to avoid duplicate DB work. */
    poolOverride?: CandidatePool;
};

export async function matchWorkersForStaffRequest(
    input: MatchInput,
): Promise<MatchResult> {
    const empty = (ringCellCount = 0): MatchResult => ({
        schedule: [],
        totalWorkers: 0,
        fullyCovered: false,
        candidateCount: 0,
        ringCellCount,
    });

    const pool =
        input.poolOverride ??
        (await buildCandidatePool({
            clientUserId: input.clientUserId,
            startDate: input.startDate,
            endDate: input.endDate,
            progress: input.progress,
        }));
    if (!pool.ok) {
        const result = empty(pool.ringCellCount);
        await input.progress?.({ kind: "done", result });
        return result;
    }

    const before = pool.candidates.length;
    const candidates = await filterCandidatesForTier(
        pool.candidates,
        input.pricingTierId,
        input.profession,
        input.requirements,
    );
    if (!input.poolOverride) {
        await input.progress?.({
            kind: "filter",
            tierId: input.pricingTierId,
            remaining: candidates.length,
            before,
        });
    }

    const calendarDays = enumerateCalendarDays(input.startDate, input.endDate);
    await input.progress?.({ kind: "scheduling", days: calendarDays.length });

    const byDate = new Map(input.dailyWindows.map((w) => [w.date, w]));
    const schedule: DaySchedule[] = calendarDays.map((date) => {
        const dow = dayOfWeekFromYmd(date);
        const plan = byDate.get(date);
        if (!plan?.slots?.length) {
            return { date, dayOfWeek: dow, assignments: [], covered: false };
        }
        const assignments: WorkerAssignment[] = [];
        let covered = true;
        for (const slot of plan.slots) {
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
        return { date, dayOfWeek: dow, assignments, covered };
    });

    const allWorkerIds = new Set(
        schedule.flatMap((d) => d.assignments.map((a) => a.userId)),
    );

    const result: MatchResult = {
        schedule,
        totalWorkers: allWorkerIds.size,
        fullyCovered: schedule.every((d) => d.covered),
        candidateCount: candidates.length,
        ringCellCount: pool.ringCellCount,
    };
    await input.progress?.({ kind: "done", result });
    return result;
}
