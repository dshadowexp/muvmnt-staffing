import "server-only";

import { createAdminClient } from "@/supabase/server";
import { gridRing } from "h3-js";

const H3_K = 5;

/**
 * Per-day open-positions count for the requesting client's region. Driven by a
 * single grouped query against `staff_requests`; cached in-process for a short
 * window so the same client clicking around the wizard doesn't re-fetch.
 *
 * Demand-pricing inputs are intentionally regional (not global) — the surge
 * for "RNs in Toronto next Saturday" should not move based on requests in
 * Halifax. The region key here is the request's `cell_id` and its rings; we can
 * later broaden this to the same ring the matcher uses (over `workers.cell_id`)
 * without changing the call surface.
 */

export type DemandSnapshot = {
    /** ISO yyyy-mm-dd → open positions across overlapping pending requests. */
    perDay: Map<string, number>;
    fetchedAt: number;
};

const TTL_MS = 60_000; // 1 min — enough to cover a single wizard session
const MAX_ENTRIES = 256;
const cache = new Map<string, DemandSnapshot>();

function cacheKey(cellId: string, startYmd: string, endYmd: string): string {
    return `${cellId}\u241F${startYmd}\u241F${endYmd}`;
}

function gcCache() {
    if (cache.size <= MAX_ENTRIES) return;
    // Drop the oldest 25% (Map preserves insertion order).
    const drop = Math.ceil(cache.size * 0.25);
    let i = 0;
    for (const key of cache.keys()) {
        if (i++ >= drop) break;
        cache.delete(key);
    }
}

export async function getRegionalDemand(args: {
    cellId: string;
    startYmd: string;
    endYmd: string;
    excludeRequestId?: string;
}): Promise<DemandSnapshot> {
    const key = cacheKey(args.cellId, args.startYmd, args.endYmd);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
        return hit;
    }

    const supabase = await createAdminClient();
    const rings = gridRing(args.cellId, H3_K);
    rings.push(args.cellId)
    let query = supabase
        .from("staff_requests")
        .select("start_date, end_date, positions")
        .in("cell_id", rings)
        .lte("start_date", args.endYmd)
        .or(`end_date.gte.${args.startYmd},end_date.is.null`);

    if (args.excludeRequestId) {
        query = query.neq("id", args.excludeRequestId);
    }

    const { data } = await query;
    const perDay = new Map<string, number>();

    for (const row of data ?? []) {
        const rowStart = (row.start_date as string).slice(0, 10);
        const rowEnd = ((row.end_date as string | null) ?? rowStart).slice(0, 10);
        const positions = Number(row.positions) || 0;
        if (positions <= 0) continue;

        const lo = rowStart > args.startYmd ? rowStart : args.startYmd;
        const hi = rowEnd < args.endYmd ? rowEnd : args.endYmd;
        for (const day of enumerateYmd(lo, hi)) {
            perDay.set(day, (perDay.get(day) ?? 0) + positions);
        }
    }

    const snapshot: DemandSnapshot = { perDay, fetchedAt: Date.now() };
    cache.set(key, snapshot);
    gcCache();
    return snapshot;
}

/**
 * Synthetic baseline used until we materialize a rolling 30-day average per
 * (region, weekday). Tuned so a "normal" weekday in a healthy region maps to
 * `demand ≈ 1.0` (no surge).
 */
const WEEKDAY_BASELINE: Record<number, number> = {
    0: 40, // Sunday
    1: 80, // Monday
    2: 80, // Tuesday
    3: 80, // Wednesday
    4: 80, // Thursday
    5: 90, // Friday
    6: 60, // Saturday
};

export function baselinePositionsForWeekday(weekday: number): number {
    return WEEKDAY_BASELINE[weekday] ?? 80;
}

function enumerateYmd(startYmd: string, endYmd: string): string[] {
    if (startYmd > endYmd) return [];
    const out: string[] = [];
    const cursor = new Date(`${startYmd}T00:00:00Z`);
    const stop = new Date(`${endYmd}T00:00:00Z`);
    while (cursor.getTime() <= stop.getTime()) {
        out.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
}
