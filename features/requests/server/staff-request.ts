import "server-only";

import { z } from "zod";
import { auth as triggerAuth, tasks } from "@trigger.dev/sdk/v3";
import { createAdminClient } from "@/services/supabase/server";
import type { matchCoverageTask } from "@/trigger/staff-requests";
import {
    DEFAULT_STAFF_REQUEST_PROFESSION,
    mergePersistedStaffRequestRequirements,
    STAFF_REQUEST_PROFESSION_PLACEHOLDER,
    STAFF_REQUEST_STATUS_CONFIRMED,
    STAFF_REQUEST_STATUS_PENDING_COVERAGE,
    STAFF_REQUEST_STATUS_PENDING_PRICING,
} from "../constants";
import {
    buildCandidatePool,
    emptyMatchResult,
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
import { getSession } from "@/lib/session";
import { normalizeProfessionId } from "@/lib/professions";
import { gridDiskDistances } from "h3-js";
import { H3_K } from "@/lib/constants";
import type { Database, Json } from "@/services/supabase/types/database";
import {
    createDraftLocationSchema,
    locationPayloadToJson,
} from "../lib/staff-request-location-json";

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
    cellId: z.string().min(1),
    positions: z.coerce.number().int().min(1),
    dailyWindows: z.array(dailyWindowSchema).min(1),
    profession: z.string().min(1).default(DEFAULT_STAFF_REQUEST_PROFESSION),
    requirements: z.array(z.string()).default([]),
    tasks: z.array(z.string()).default([]),
    notes: z.string().optional().default(""),
    location: createDraftLocationSchema,
});

export type CreateDraftPayload = z.infer<typeof createDraftPayloadSchema>;

export type StaffRequestRow = Database["public"]["Tables"]["staff_requests"]["Row"];

/** Canonical profession id for pricing, matching, and estimates. */
export function professionForStaffRequest(
    row: Pick<StaffRequestRow, "profession">,
): string {
    return normalizeProfessionId(row.profession);
}

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

export const COVERAGE_REFRESH_AFTER_MS = 5 * 60 * 1000;

export function isCoverageFresh(cachedAtIso: string | null): boolean {
    if (!cachedAtIso) return false;
    const t = Date.parse(cachedAtIso);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < COVERAGE_REFRESH_AFTER_MS;
}

async function getRowOrFail(requestId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("id", requestId)
        .single();
    if (error || !data) {
        return { ok: false as const, message: error?.message ?? "Request not found" };
    }

    return { ok: true as const, row: data as StaffRequestRow };
}

export async function getStaffRequestRow(requestId: string) {
    const session = await getSession();
    if (!session) return { ok: false, message: "Unauthenticated" };
    if (session.role !== "client") return { ok: false, message: "Unauthorized" };
    const clientUserId = session.userId;
    const result = await getRowOrFail(requestId);
    if (!result.ok) return result;
    return { ok: true, data: result.row };
}

/**
 * Latest `pending_pricing` row for this client (step 1 still in progress).
 * Used to resume `/client/requests/new` without creating duplicates on each submit.
 */
export async function getPendingPricingStaffRequestForClient(
): Promise<{ ok: true; data: StaffRequestRow } | { ok: false; message: string }> {
    const session = await getSession();
    if (!session) return { ok: false, message: "Unauthenticated" };
    if (session.role !== "client") return { ok: false, message: "Unauthorized" };

    const clientUserId = session.userId;
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("staff_requests")
        .select("*")
        .eq("client_user_id", clientUserId)
        .in("status", [
            STAFF_REQUEST_STATUS_PENDING_PRICING,
            STAFF_REQUEST_STATUS_PENDING_COVERAGE,
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return { ok: false, message: error?.message ?? "SupabaseError" };
    return { ok: true, data: data as StaffRequestRow };
}

export async function createStaffRequestDraft(
    clientUserId: string,
    payload: CreateDraftPayload,
): Promise<
    | { ok: true; requestId: string; row: StaffRequestRow }
    | { ok: false; message: string }
> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from("staff_requests")
        .insert({
            client_user_id: clientUserId,
            cell_id: payload.cellId,
            profession: normalizeProfessionId(payload.profession),
            positions: payload.positions,
            requirements: mergePersistedStaffRequestRequirements(
                payload.requirements,
            ),
            tasks: payload.tasks,
            notes: payload.notes,
            start_date: payload.startDate,
            end_date: payload.endDate ?? null,
            daily_time_windows: payload.dailyWindows,
            status: STAFF_REQUEST_STATUS_PENDING_PRICING,
            location: locationPayloadToJson(payload.location) as Json,
        })
        .select("*")
        .single();

    if (error || !data) {
        return {
            ok: false,
            message: error?.message ?? "Could not create staff request draft.",
        };
    }
    return { ok: true, requestId: data.id, row: data as StaffRequestRow };
}

export async function updateStaffRequestDraft(
    requestId: string,
    payload: CreateDraftPayload,
): Promise<{ ok: true; requestId: string } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const rowCheck = await getRowOrFail(requestId);
    if (!rowCheck.ok) return { ok: false, message: rowCheck.message };
    if (rowCheck.row.status === STAFF_REQUEST_STATUS_CONFIRMED) {
        return {
            ok: false,
            message: "This request can no longer be edited from the schedule step.",
        };
    }

    const { error } = await supabase
        .from("staff_requests")
        .update({
            cell_id: payload.cellId,
            profession: normalizeProfessionId(payload.profession),
            positions: payload.positions,
            requirements: mergePersistedStaffRequestRequirements(
                payload.requirements,
            ),
            tasks: payload.tasks,
            notes: payload.notes,
            start_date: payload.startDate,
            end_date: payload.endDate ?? null,
            daily_time_windows: payload.dailyWindows,
            location: locationPayloadToJson(payload.location) as Json,
        })
        .eq("id", requestId);

    if (error) return { ok: false, message: error.message };
    return { ok: true, requestId };
}

export async function updateStaffRequestJobProfile(
    clientUserId: string,
    requestId: string,
    input: { profession: string; tasks: string[]; requirements: string[] },
): Promise<{ ok: true } | { ok: false; message: string }> {
    const rowCheck = await getRowOrFail(requestId);
    if (!rowCheck.ok) return { ok: false, message: rowCheck.message };
    if (rowCheck.row.client_user_id !== clientUserId) {
        return { ok: false, message: "Not authorized" };
    }
    if (rowCheck.row.status !== STAFF_REQUEST_STATUS_PENDING_PRICING) {
        return {
            ok: false,
            message: "Job details can only be changed while choosing a pricing tier.",
        };
    }

    const requirements = mergePersistedStaffRequestRequirements(
        input.requirements,
    );

    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("staff_requests")
        .update({
            profession: normalizeProfessionId(input.profession),
            tasks: input.tasks,
            requirements,
        })
        .eq("id", requestId)
        .eq("client_user_id", clientUserId)
        .eq("status", STAFF_REQUEST_STATUS_PENDING_PRICING);

    if (error) return { ok: false, message: error.message };
    return { ok: true };
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
        .eq("client_user_id", args.clientUserId);
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
        .eq("client_user_id", args.clientUserId);
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
    return data as StaffRequestRow;
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
        .eq("client_user_id", args.clientUserId)
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
        profession: professionForStaffRequest(row),
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
    const tier = row.pricing_tier ?? "pulse";
    const profession = professionForStaffRequest(row);
    const requirements = mergePersistedStaffRequestRequirements(
        row.requirements ?? [],
    );

    const rings = gridDiskDistances(row.cell_id, H3_K);

    let result: MatchResult = emptyMatchResult;
    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        const pool = await buildCandidatePool({
            dailyWindows,
            ring,
            progress: args.progress,
        });
        
        console.log("ring", i);
        console.log("pool", pool.ok ? pool.candidates : 0);

        const allCandidates: MatchCandidate[] = pool.ok ? pool.candidates : [];

        const filtered = await filterCandidatesForTier(
            allCandidates,
            tier,
            profession,
            requirements,
        );

        console.log("filtered", filtered.length);

        await args.progress?.({
            kind: "filter",
            tierId: tier,
            remaining: filtered.length,
            before: allCandidates.length,
        });

        result = await matchWorkersForStaffRequest({
            ring,
            dailyWindows,
            pricingTierId: tier,
            profession,
            requirements,
            progress: args.progress,
            filteredCandidates: filtered,
            existingMatchResult: result,
        });

        if (result.fullyCovered) {
            console.log("fully covered", i);
            break;
        }
    }

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
        clientUserId: row.client_user_id,
        cache,
    });

    await args.progress?.({ kind: "done", result });

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
    profession: string = STAFF_REQUEST_PROFESSION_PLACEHOLDER,
): number {
    return estimatedTotalCents({ profession, positions, dailyWindows }, rate);
}
