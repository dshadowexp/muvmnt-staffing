import "server-only";

import { z } from "zod";
import { auth as triggerAuth, tasks } from "@trigger.dev/sdk/v3";
import { createAdminClient } from "@/services/supabase/server";
import type { matchCoverageTask } from "@/trigger/staff-requests";
import {
    STAFF_REQUEST_PROFESSION_PLACEHOLDER,
    STAFF_REQUEST_STATUS_CONFIRMED,
    STAFF_REQUEST_STATUS_PENDING_COVERAGE,
    STAFF_REQUEST_STATUS_PENDING_PRICING,
} from "../constants";
import {
    buildCandidatePool,
    filterCandidatesForTier,
    matchWorkersForStaffRequest,
    type DailyWindowMatch,
    type MatchCandidate,
    type MatchResult,
    type ProgressFn,
} from "./matching";
import {
    estimatedTotalCents,
    quoteStaffRequest,
    type PricingQuote,
    type PricingTier,
} from "./pricing";
import { totalCoveredHoursFromMatchSchedule } from "../pricing/staff-request-pricing";
import { encodeLatLngToCellId } from "@/services/h3/client";

const dailyWindowSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slots: z
        .array(
            z.object({
                startTime: z.string().regex(/^\d{2}:\d{2}$/),
                endTime: z.string().regex(/^\d{2}:\d{2}$/),
            }),
        )
        .min(1),
});

export const createDraftPayloadSchema = z.object({
    startDate: z.string().min(1),
    endDate: z.string().nullable().optional(),
    positions: z.coerce.number().int().min(1),
    dailyWindows: z.array(dailyWindowSchema).min(1),
    requirements: z.array(z.string()).default([]),
    tasks: z.array(z.string()).default([]),
    notes: z.string().optional().default(""),
});

export type CreateDraftPayload = z.infer<typeof createDraftPayloadSchema>;

export type StaffRequestRow = {
    id: string;
    client_id: string;
    cell_id: string;
    start_date: string;
    end_date: string | null;
    daily_time_windows: { date: string; slots: { startTime: string; endTime: string }[] }[];
    requirements: string[];
    tasks: string[];
    positions: number;
    notes: string | null;
    pricing_rate: number | null;
    pricing_tier: string | null;
    status: string;
    coverage_data: unknown;
    coverage_data_at: string | null;
    payment_session_id: string | null;
};

/** Cached coverage payload kept on `staff_requests.coverage_data` (jsonb). */
export type CoverageDataCache = {
    schedule: MatchResult["schedule"];
    totalWorkers: number;
    fullyCovered: boolean;
    candidateCount: number;
    ringCellCount: number;
    tiers: PricingTier[];
    pricingTier: string | null;
    pricingRate: number | null;
    currency: "CAD";
};

export const COVERAGE_REFRESH_AFTER_MS = 30 * 60 * 1000;

export function isCoverageFresh(cachedAtIso: string | null): boolean {
    if (!cachedAtIso) return false;
    const t = Date.parse(cachedAtIso);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < COVERAGE_REFRESH_AFTER_MS;
}

async function getRowOrFail(requestId: string, clientUserId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("id", requestId)
        .single();
    if (error || !data) {
        return { ok: false as const, message: error?.message ?? "Request not found" };
    }
    if (data.client_id !== clientUserId) {
        return { ok: false as const, message: "Not authorized" };
    }
    return { ok: true as const, row: data as unknown as StaffRequestRow };
}

export async function getStaffRequestRow(requestId: string, clientUserId: string) {
    return getRowOrFail(requestId, clientUserId);
}

/**
 * Latest `pending_pricing` row for this client (step 1 still in progress).
 * Used to resume `/client/requests/new` without creating duplicates on each submit.
 */
export async function getPendingPricingStaffRequestForClient(
    clientUserId: string,
): Promise<StaffRequestRow | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("client_id", clientUserId)
        .eq("status", STAFF_REQUEST_STATUS_PENDING_PRICING)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return data as unknown as StaffRequestRow;
}

export async function createStaffRequestDraft(
    clientUserId: string,
    payload: CreateDraftPayload,
): Promise<
    | { ok: true; requestId: string; row: StaffRequestRow }
    | { ok: false; message: string }
> {
    const supabase = await createAdminClient();
    const { data: loc, error: locErr } = await supabase
        .from("locations")
        .select("lat, lng")
        .eq("user_id", clientUserId)
        .single();

    if (locErr || !loc?.lat || !loc?.lng) {
        return {
            ok: false,
            message:
                locErr?.message ??
                "Add your business address before creating a staff request.",
        };
    }

    const cellId = encodeLatLngToCellId(loc.lat, loc.lng);

    const { data, error } = await supabase
        .from("staff_requests")
        .insert({
            client_id: clientUserId,
            cell_id: cellId,
            positions: payload.positions,
            requirements: payload.requirements,
            tasks: payload.tasks,
            notes: payload.notes,
            start_date: payload.startDate,
            end_date: payload.endDate ?? null,
            daily_time_windows: payload.dailyWindows,
            status: STAFF_REQUEST_STATUS_PENDING_PRICING,
        })
        .select("*")
        .single();

    if (error || !data) {
        return {
            ok: false,
            message: error?.message ?? "Could not create staff request draft.",
        };
    }
    return { ok: true, requestId: data.id, row: data as unknown as StaffRequestRow };
}

export async function updateStaffRequestDraft(
    clientUserId: string,
    requestId: string,
    payload: CreateDraftPayload,
): Promise<{ ok: true; requestId: string } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const rowCheck = await getRowOrFail(requestId, clientUserId);
    if (!rowCheck.ok) return { ok: false, message: rowCheck.message };
    if (rowCheck.row.status !== STAFF_REQUEST_STATUS_PENDING_PRICING) {
        return {
            ok: false,
            message: "This request can no longer be edited from the schedule step.",
        };
    }

    const { data: loc, error: locErr } = await supabase
        .from("locations")
        .select("lat, lng")
        .eq("user_id", clientUserId)
        .single();

    if (locErr || !loc?.lat || !loc?.lng) {
        return {
            ok: false,
            message:
                locErr?.message ??
                "Add your business address before updating a staff request.",
        };
    }

    const cellId = encodeLatLngToCellId(loc.lat, loc.lng);

    const { error } = await supabase
        .from("staff_requests")
        .update({
            cell_id: cellId,
            positions: payload.positions,
            requirements: payload.requirements,
            tasks: payload.tasks,
            notes: payload.notes,
            start_date: payload.startDate,
            end_date: payload.endDate ?? null,
            daily_time_windows: payload.dailyWindows,
        })
        .eq("id", requestId)
        .eq("client_id", clientUserId)
        .eq("status", STAFF_REQUEST_STATUS_PENDING_PRICING);

    if (error) return { ok: false, message: error.message };
    return { ok: true, requestId };
}

export async function persistPricingTier(args: {
    requestId: string;
    clientUserId: string;
    tierId: string;
    hourlyRate: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("staff_requests")
        .update({
            pricing_tier: args.tierId,
            pricing_rate: args.hourlyRate,
            status: STAFF_REQUEST_STATUS_PENDING_COVERAGE,
        })
        .eq("id", args.requestId)
        .eq("client_id", args.clientUserId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

export async function persistCoverageCache(args: {
    requestId: string;
    clientUserId: string;
    cache: CoverageDataCache;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("staff_requests")
        .update({
            coverage_data: args.cache as unknown as never,
            coverage_data_at: new Date().toISOString(),
        })
        .eq("id", args.requestId)
        .eq("client_id", args.clientUserId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

export async function persistCheckoutSession(args: {
    requestId: string;
    clientUserId: string;
    sessionId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("staff_requests")
        .update({ payment_session_id: args.sessionId })
        .eq("id", args.requestId)
        .eq("client_id", args.clientUserId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

export async function markRequestConfirmed(requestId: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("staff_requests")
        .update({ status: STAFF_REQUEST_STATUS_CONFIRMED })
        .eq("id", requestId);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
}

/** Pull a row by id without auth check (for trigger tasks). */
export async function getStaffRequestById(requestId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("id", requestId)
        .single();
    if (error || !data) return null;
    return data as unknown as StaffRequestRow;
}

export async function abandonStaffRequestDraft(args: {
    requestId: string;
    clientUserId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("staff_requests")
        .delete()
        .eq("id", args.requestId)
        .eq("client_id", args.clientUserId)
        .neq("status", STAFF_REQUEST_STATUS_CONFIRMED);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

/**
 * Build a pricing quote from the row alone — no candidate pool, no h3 ring,
 * no compliance join. Hits a single grouped query for the regional demand
 * signal and computes everything else from request fields the row already has.
 */
export async function buildPricingQuoteForRequest(args: {
    requestId: string;
}): Promise<{ ok: true; quote: PricingQuote } | { ok: false; message: string }> {
    const row = await getStaffRequestById(args.requestId);
    if (!row) return { ok: false, message: "Request not found" };

    const dailyWindows = (row.daily_time_windows ?? []) as DailyWindowMatch[];
    const quote = await quoteStaffRequest({
        requestId: args.requestId,
        cellId: row.cell_id,
        profession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
        positions: row.positions,
        dailyWindows,
    });

    return { ok: true, quote };
}


/**
 * Run the full match pipeline using the row's persisted schedule + tier.
 * Caches a `CoverageDataCache` blob on `staff_requests.coverage_data` and
 * stamps `coverage_data_at`.
 */
export async function runMatchForStaffRequest(args: {
    requestId: string;
    progress?: ProgressFn;
}): Promise<
    | { ok: true; cache: CoverageDataCache }
    | { ok: false; message: string }
> {
    const row = await getStaffRequestById(args.requestId);
    if (!row) return { ok: false, message: "Request not found" };

    const dailyWindows = (row.daily_time_windows ?? []) as DailyWindowMatch[];
    const tier = row.pricing_tier ?? "standard";

    const startYmd = ymdFromIsoOrYmd(row.start_date);
    const endYmd = row.end_date ? ymdFromIsoOrYmd(row.end_date) : null;

    const pool = await buildCandidatePool({
        clientUserId: row.client_id,
        startDate: startYmd,
        endDate: endYmd,
        progress: args.progress,
    });

    const allCandidates: MatchCandidate[] = pool.ok ? pool.candidates : [];

    const filtered = await filterCandidatesForTier(
        allCandidates,
        tier,
        STAFF_REQUEST_PROFESSION_PLACEHOLDER,
        row.requirements ?? [],
    );

    await args.progress?.({
        kind: "filter",
        tierId: tier,
        remaining: filtered.length,
        before: allCandidates.length,
    });

    const result = await matchWorkersForStaffRequest({
        clientUserId: row.client_id,
        startDate: startYmd,
        endDate: endYmd,
        dailyWindows,
        pricingTierId: tier,
        profession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
        requirements: row.requirements ?? [],
        progress: args.progress,
        poolOverride: pool,
    });

    const cache: CoverageDataCache = {
        schedule: result.schedule,
        totalWorkers: result.totalWorkers,
        fullyCovered: result.fullyCovered,
        candidateCount: result.candidateCount,
        ringCellCount: result.ringCellCount,
        tiers: [],
        pricingTier: row.pricing_tier ?? null,
        pricingRate: row.pricing_rate ?? null,
        currency: "CAD",
    };

    await persistCoverageCache({
        requestId: args.requestId,
        clientUserId: row.client_id,
        cache,
    });

    return { ok: true, cache };
}

/**
 * Kick off a `staff-requests.match-coverage` run and mint a 30-minute public
 * access token for the browser to subscribe with `useRealtimeRun`.
 *
 * Pulled out of the server action so server components can call it after their
 * own auth/ownership checks without re-loading the row.
 */
export async function dispatchCoverageMatchRun(requestId: string) {
    const handle = await tasks.trigger<typeof matchCoverageTask>(
        "staff-requests.match-coverage",
        { requestId },
        { tags: [`staff-request:${requestId}`] },
    );
    const publicAccessToken = await triggerAuth.createPublicToken({
        scopes: { read: { runs: [handle.id] } },
        expirationTime: "30m",
    });
    return { runId: handle.id, publicAccessToken };
}

function ymdFromIsoOrYmd(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return value.slice(0, 10);
}

export function estimatedCoverageTotalCents(
    schedule: MatchResult["schedule"],
    rate: number,
): number {
    return Math.round(totalCoveredHoursFromMatchSchedule(schedule) * rate * 100);
}

export function estimatedScheduleTotalCents(
    dailyWindows: DailyWindowMatch[],
    positions: number,
    rate: number,
): number {
    return estimatedTotalCents(
        { profession: "_", positions, dailyWindows },
        rate,
    );
}
