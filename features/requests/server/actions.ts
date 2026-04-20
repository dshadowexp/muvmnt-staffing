"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth as triggerAuth, tasks } from "@trigger.dev/sdk/v3";

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
    persistCheckoutSession,
    persistPricingTier,
    updateStaffRequestDraft,
    type CoverageDataCache,
} from "./staff-request";
import { confirmAndChargeTask } from "@/trigger/staff-requests";
import { getBillingAccount } from "@/features/payments/billing/dal/queries";
import { getStripeServer } from "@/services/stripe/server";
import { env } from "@/data/env/client";
import { getSession } from "@/lib/session";

const VALID_TIERS = new Set<string>([
    ...PRICING_TIER_IDS,
    ...LEGACY_PRICING_TIER_IDS,
]);

async function requireClient() {
    const session = await getSession();
    if (!session) return { error: "Not signed in" as const };
    if (session.role !== "client") return { error: "Only clients can manage requests" as const };
    return { userId: session.userId };
}

// ─── Step 1: create or update the draft (schedule) ─────────────────────────

const upsertScheduleSchema = createDraftPayloadSchema.extend({
    requestId: z.string().min(1).optional(),
});

/**
 * Creates a new `pending_pricing` row, or updates an existing one when
 * `requestId` is the client's current `pending_pricing` draft.
 */
export async function upsertStaffRequestScheduleAction(unsafe: unknown) {
    const auth = await requireClient();
    if ("error" in auth) return { error: true as const, message: auth.error };

    const parsed = upsertScheduleSchema.safeParse(unsafe);
    if (!parsed.success) {
        return {
            error: true as const,
            message: parsed.error.issues[0]?.message ?? "Invalid request data",
        };
    }

    const { requestId, ...payload } = parsed.data;

    if (requestId) {
        const updated = await updateStaffRequestDraft(auth.userId, requestId, payload);
        if (!updated.ok) return { error: true as const, message: updated.message };
        return { error: false as const, requestId: updated.requestId };
    }

    const created = await createStaffRequestDraft(auth.userId, payload);
    if (!created.ok) return { error: true as const, message: created.message };
    return { error: false as const, requestId: created.requestId };
}

/** @deprecated Use {@link upsertStaffRequestScheduleAction} with optional `requestId`. */
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
    const auth = await requireClient();
    if ("error" in auth) return { error: true as const, message: auth.error };

    const parsed = pricingTierSchema.safeParse(unsafe);
    if (!parsed.success) {
        return {
            error: true as const,
            message: parsed.error.issues[0]?.message ?? "Invalid pricing selection",
        };
    }

    const update = await persistPricingTier({
        requestId: parsed.data.requestId,
        clientUserId: auth.userId,
        tierId: parsed.data.tierId,
        hourlyRate: parsed.data.hourlyRate,
    });

    if (!update.ok) return { error: true as const, message: update.message };
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
    const session = await requireClient();
    if ("error" in session) return { error: true as const, message: session.error };

    const row = await getStaffRequestRow(requestId, session.userId);
    if (!row.ok) return { error: true as const, message: row.message };

    if (
        row.row.coverage_data &&
        isCoverageFresh(row.row.coverage_data_at)
    ) {
        return {
            error: false as const,
            cached: true as const,
            cache: row.row.coverage_data as CoverageDataCache,
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
    const session = await requireClient();
    if ("error" in session) return { error: true as const, message: session.error };

    const row = await getStaffRequestRow(requestId, session.userId);
    if (!row.ok) return { error: true as const, message: row.message };
    if (row.row.status === STAFF_REQUEST_STATUS_CONFIRMED) {
        redirect(`/dashboard/requests/${requestId}`);
    }

    const cache = row.row.coverage_data as CoverageDataCache | null;
    if (!cache?.schedule?.length || row.row.pricing_rate == null) {
        return {
            error: true as const,
            message: "Coverage is not ready yet — please wait for matching to finish.",
        };
    }

    const billing = await getBillingAccount();
    const account = "data" in billing ? billing.data : null;

    if (account?.customerId && account.defaultPaymentMethodId) {
        const handle = await tasks.trigger<typeof confirmAndChargeTask>(
            "staff-requests.confirm-and-charge",
            {
                requestId,
                stripeCustomerId: account.customerId,
                paymentMethodId: account.defaultPaymentMethodId,
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

    // No saved card → Stripe Checkout Session.
    const stripe = getStripeServer();
    const totalCents = totalFromCache(cache, row.row.pricing_rate);

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${requestId}?checkout=success`;
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${requestId}/coverage?checkout=cancelled`;

    const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: account?.customerId,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: "cad",
                    unit_amount: totalCents,
                    product_data: {
                        name: "Staff request coverage",
                        description: `Request ${requestId}`,
                    },
                },
            },
        ],
        payment_intent_data: {
            setup_future_usage: "off_session",
            metadata: { staff_request_id: requestId, client_id: session.userId },
        },
        metadata: {
            staff_request_id: requestId,
            client_id: session.userId,
            kind: "staff_request",
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    if (!checkout.url) {
        return {
            error: true as const,
            message: "Stripe did not return a checkout URL — try again.",
        };
    }

    await persistCheckoutSession({
        requestId,
        clientUserId: session.userId,
        sessionId: checkout.id,
    });

    return {
        error: false as const,
        mode: "checkout" as const,
        url: checkout.url,
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
    const session = await requireClient();
    if ("error" in session) return { error: true as const, message: session.error };
    const result = await abandonStaffRequestDraft({
        requestId,
        clientUserId: session.userId,
    });
    if (!result.ok) return { error: true as const, message: result.message };
    return { error: false as const };
}
