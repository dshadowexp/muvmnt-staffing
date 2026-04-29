"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth as triggerAuth, tasks } from "@trigger.dev/sdk/v3";
import { COMPLIANCE_IDS_SET } from "@/lib/compliance";
import { STAFF_REQUEST_SKILL_IDS_SET } from "@/lib/skills";
import { tryNormalizeProfessionId } from "@/lib/professions";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";
import {
    LEGACY_PRICING_TIER_IDS,
    PRICING_TIER_IDS,
    STAFF_REQUEST_STATUS_CONFIRMED,
} from "../constants";
import {
    abandonStaffRequestDraft,
    createDraftPayloadSchema,
    createStaffRequestDraft,
    dispatchCoverageMatchRun,
    getStaffRequestRow,
    isCoverageFresh,
    persistPricingTier,
    updateStaffRequestDraft,
    updateStaffRequestJobProfile,
    type CoverageDataCache,
} from "./staff-request";
import { confirmAndChargeTask } from "@/trigger/staff-requests";
import { getBillingAccount } from "@/features/billing/dal/payment-methods";
import { getStripeServer } from "@/services/stripe/server";
import { env } from "@/data/env/client";
import { requireOperatorContext } from "@/features/account/server/operator-context";

const VALID_TIERS = new Set<string>([
    ...PRICING_TIER_IDS,
    ...LEGACY_PRICING_TIER_IDS,
]);

// ─── Step 1: create or update the draft (schedule) ─────────────────────────

const upsertScheduleSchema = createDraftPayloadSchema.extend({
    requestId: z.string().min(1).optional(),
});

/**
 * Creates a new `pending_pricing` row, or updates an existing one when
 * `requestId` is the client's current `pending_pricing` draft.
 */
export async function upsertStaffRequestScheduleAction(unsafe: unknown) {
    const auth = await requireOperatorContext();
    if (!auth.ok) return { error: true as const, message: auth.message };

    const parsed = upsertScheduleSchema.safeParse(unsafe);
    if (!parsed.success) {
        return {
            error: true as const,
            message: parsed.error.issues[0]?.message ?? "Invalid request data",
        };
    }

    const { requestId, ...payload } = parsed.data;

    if (requestId) {
        const updated = await updateStaffRequestDraft(
            requestId,
            auth.facilityId,
            payload,
        );
        if (!updated.ok) return { error: true as const, message: updated.message };
        return { error: false as const, requestId: updated.requestId };
    }

    const created = await createStaffRequestDraft({
        facilityId: auth.facilityId,
        operatorId: auth.operatorId,
        payload,
    });
    if (!created.ok) return { error: true as const, message: created.message };
    return { error: false as const, requestId: created.requestId };
}

export async function createStaffRequestDraftAction(unsafe: unknown) {
    return upsertStaffRequestScheduleAction(unsafe);
}

// ─── Step 2: pick + persist a pricing tier ─────────────────────────────────

const pricingTierSchema = z.object({
    requestId: z.string().min(1),
    tierId: z.string().refine((v) => VALID_TIERS.has(v), "Invalid tier"),
    hourlyRate: z.coerce.number().min(15, "Minimum hourly rate is $15"),
});

export async function applyStaffRequestPricingAction(unsafe: unknown) {
    const auth = await requireOperatorContext();
    if (!auth.ok) return { error: true as const, message: auth.message };

    const parsed = pricingTierSchema.safeParse(unsafe);
    if (!parsed.success) {
        return {
            error: true as const,
            message: parsed.error.issues[0]?.message ?? "Invalid pricing selection",
        };
    }

    const update = await persistPricingTier({
        requestId: parsed.data.requestId,
        facilityId: auth.facilityId,
        tierId: parsed.data.tierId,
        hourlyRate: parsed.data.hourlyRate,
    });

    if (!update.ok) return { error: true as const, message: update.message };
    return { error: false as const };
}

const staffRequestJobProfileSchema = z.object({
    requestId: z.string().min(1),
    profession: z
        .string()
        .min(1)
        .refine((v) => tryNormalizeProfessionId(v) !== null, "Invalid profession")
        .transform((v) => tryNormalizeProfessionId(v)!),
    tasks: z.array(
        z.string().refine(
            (v) => STAFF_REQUEST_SKILL_IDS_SET.has(v),
            "Invalid skill",
        ),
    ),
    requirements: z.array(
        z.string().refine(
            (v) => COMPLIANCE_IDS_SET.has(v),
            "Invalid compliance requirement",
        ),
    ),
});

export async function updateStaffRequestJobProfileAction(unsafe: unknown) {
    const auth = await requireOperatorContext();
    if (!auth.ok) return { error: true as const, message: auth.message };

    const parsed = staffRequestJobProfileSchema.safeParse(unsafe);
    if (!parsed.success) {
        return {
            error: true as const,
            message: parsed.error.issues[0]?.message ?? "Invalid job profile",
        };
    }

    const result = await updateStaffRequestJobProfile(auth.facilityId, parsed.data.requestId, {
        profession: parsed.data.profession,
        tasks: parsed.data.tasks,
        requirements: parsed.data.requirements,
    });

    if (!result.ok) return { error: true as const, message: result.message };
    return { error: false as const };
}

// ─── Step 3: dispatch / fetch coverage matching ────────────────────────────

/**
 * Dispatches the trigger task and returns a `publicAccessToken` so the
 * coverage page can subscribe with `useRealtimeRun` from the browser. If a
 * fresh coverage_data exists (<30m), the cached value is returned without
 * re-running the matcher.
 */
export async function startCoverageMatchAction(requestId: string) {
    const session = await requireOperatorContext();
    if (!session.ok) return { error: true as const, message: session.message };

    const row = await getStaffRequestRow(requestId);
    if (!row.ok) return { error: true as const, message: row.message };
    if (!row.data) return { error: true as const, message: "Request not found" };

    if (
        row.data.coverage_data &&
        isCoverageFresh(row.data.coverage_data_at)
    ) {
        return {
            error: false as const,
            cached: true as const,
            cache: row.data.coverage_data as CoverageDataCache,
        };
    }

    const dispatched = await dispatchCoverageMatchRun(requestId);
    return {
        error: false as const,
        cached: false as const,
        runId: dispatched.runId,
        publicAccessToken: dispatched.publicAccessToken,
    };
}

// ─── Step 3 (confirm): charge + create shifts OR open a Checkout Session ──

export async function confirmStaffRequestAction(requestId: string) {
    const session = await requireOperatorContext();
    if (!session.ok) return { error: true as const, message: session.message };

    const row = await getStaffRequestRow(requestId);
    if (!row.ok) return { error: true as const, message: row.message };
    if (!row.data) return { error: true as const, message: "Request not found" };
    if (row.data.status === STAFF_REQUEST_STATUS_CONFIRMED) {
        redirect(`/dashboard/requests/${requestId}`);
    }

    const cache = row.data.coverage_data as CoverageDataCache | null;
    if (!cache?.schedule?.length || row.data.pricing_rate == null) {
        redirect(`/dashboard/requests/${requestId}/pricing`);
    }

    const handle = await tasks.trigger<typeof confirmAndChargeTask>(
        "staff-requests.confirm-and-charge",
        {
            requestId,
        },
        {
            tags: [`staff-request:${requestId}`],
            idempotencyKey: `staff-request-confirm:${requestId}`,
        },
    );

    const publicAccessToken = await triggerAuth.createPublicToken({
        scopes: { read: { runs: [handle.id] } },
        expirationTime: "15m",
    });

    return {
        error: false as const,
        mode: "charge" as const,
        runId: handle.id,
        publicAccessToken,
    };
}

function totalFromCache(cache: CoverageDataCache, rate: number): number {
    let hours = 0;
    for (const day of cache.schedule) {
        for (const a of day.assignments) {
            const [sh = 0, sm = 0] = a.startTime.split(":").map(Number);
            const [eh = 0, em = 0] = a.endTime.split(":").map(Number);
            hours += Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
        }
    }
    return Math.round(hours * rate * 100);
}

// ─── Worker photo (S3 key → presigned URL) ─────────────────────────────────

/**
 * Resolve a worker photo for the coverage UI. Accepts a raw S3 object key (we
 * mint a short-lived presigned URL) or a fully qualified `http(s)` URL (passed
 * through unchanged). Returns `null` on any error so the caller can fall back
 * to initials.
 */
export async function resolveMatchWorkerPhotoUrlAction(
    photoKeyOrUrl: string | null,
) {
    if (photoKeyOrUrl == null || photoKeyOrUrl === "") {
        return { url: null as string | null };
    }
    if (/^https?:\/\//i.test(photoKeyOrUrl)) {
        return { url: photoKeyOrUrl };
    }
    try {
        const { url } = await getPresignedDownloadUrl(photoKeyOrUrl);
        return { url };
    } catch {
        return { url: null as string | null };
    }
}

// ─── Abandon a draft (back from pricing/coverage) ──────────────────────────

export async function abandonStaffRequestDraftAction(requestId: string) {
    const session = await requireOperatorContext();
    if (!session.ok) return { error: true as const, message: session.message };
    const result = await abandonStaffRequestDraft({
        requestId,
        facilityId: session.facilityId,
        operatorId: session.operatorId,
    });
    if (!result.ok) return { error: true as const, message: result.message };
    return { error: false as const };
}
