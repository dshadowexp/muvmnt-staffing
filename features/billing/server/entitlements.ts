import "server-only";

import { createAdminClient } from "@/supabase/server";
import { getSubscription } from "@/features/billing/dal/subscriptions";
import type { SubscriptionRow } from "@/features/billing/dal/subscriptions";

/** Defaults when the facility has no `subscriptions` row (must match billing free-tier UI). */
export const FREE_TIER_SEATS = 1;
export const FREE_TIER_SCREENINGS = 1;
export const FREE_TIER_SCREENING_INVITES_PER_PERIOD = 1;

const STATUSES_ALLOWING_WRITES: Set<SubscriptionRow["status"]> = new Set([
    "trialing",
    "active",
    "past_due",
]);

function isUnlimitedCap(n: number): boolean {
    return n >= 9999;
}

function subscriptionAllowsWrites(sub: SubscriptionRow | null): boolean {
    if (!sub) return true;
    if (sub.status === "canceled") return false;
    return STATUSES_ALLOWING_WRITES.has(sub.status);
}

export type ScreeningInvitePeriod = { startIso: string; endIso: string };

/** Billing window for counting screening invites: subscription period, or UTC calendar month if unpaid/free. */
export function resolveScreeningInvitePeriod(sub: SubscriptionRow | null): ScreeningInvitePeriod {
    if (sub?.current_period_start && sub?.current_period_end) {
        return { startIso: sub.current_period_start, endIso: sub.current_period_end };
    }
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function resolveNumericLimits(sub: SubscriptionRow | null): {
    seatsLimit: number;
    screeningsLimit: number;
    screeningInvitesLimit: number;
} {
    if (!sub) {
        return {
            seatsLimit: FREE_TIER_SEATS,
            screeningsLimit: FREE_TIER_SCREENINGS,
            screeningInvitesLimit: FREE_TIER_SCREENING_INVITES_PER_PERIOD,
        };
    }
    return {
        seatsLimit: sub.seats_limit ?? 0,
        screeningsLimit: sub.screenings_limit ?? 0,
        screeningInvitesLimit: sub.screening_invites_limit ?? 0,
    };
}

async function countOperatorsForFacility(facilityId: string): Promise<number> {
    const supabase = await createAdminClient();
    const { count, error } = await supabase
        .from("operators")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
    if (error) throw new Error(error.message);
    return count ?? 0;
}

/** Pending team invites reserve a seat until accepted or expired. */
async function countPendingFacilityInvites(facilityId: string): Promise<number> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();
    const { count, error } = await supabase
        .from("facility_invites")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .is("accepted_at", null)
        .gt("expires_at", now);
    if (error) throw new Error(error.message);
    return count ?? 0;
}

async function countScreeningsForFacility(facilityId: string): Promise<number> {
    const supabase = await createAdminClient();
    const { count, error } = await supabase
        .from("screenings")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
    if (error) throw new Error(error.message);
    return count ?? 0;
}

async function countScreeningInvitesInPeriod(
    facilityId: string,
    period: ScreeningInvitePeriod,
): Promise<number> {
    const supabase = await createAdminClient();
    const { data: screeningRows, error: sErr } = await supabase
        .from("screenings")
        .select("id")
        .eq("facility_id", facilityId);
    if (sErr) throw new Error(sErr.message);
    const screeningIds = screeningRows?.map((r) => r.id) ?? [];
    if (screeningIds.length === 0) return 0;

    const { count, error } = await supabase
        .from("screening_invites")
        .select("*", { count: "exact", head: true })
        .in("screening_id", screeningIds)
        .gte("created_at", period.startIso)
        .lt("created_at", period.endIso)
        .neq("status", "revoked");
    if (error) throw new Error(error.message);
    return count ?? 0;
}

export type FacilityEntitlementUsage = {
    allowsWrites: boolean;
    seats: { used: number; limit: number; pendingInvites: number };
    screenings: { used: number; limit: number };
    screeningInvites: { usedInPeriod: number; limit: number; period: ScreeningInvitePeriod };
};

export async function getFacilityEntitlementUsage(facilityId: string): Promise<FacilityEntitlementUsage> {
    const sub = await getSubscription(facilityId);
    const allowsWrites = subscriptionAllowsWrites(sub);
    const limits = resolveNumericLimits(sub);
    const period = resolveScreeningInvitePeriod(sub);

    const [operatorCount, pendingTeamInvites, screeningCount, screeningInvitesInPeriod] =
        await Promise.all([
            countOperatorsForFacility(facilityId),
            countPendingFacilityInvites(facilityId),
            countScreeningsForFacility(facilityId),
            countScreeningInvitesInPeriod(facilityId, period),
        ]);

    const seatsUsed = operatorCount + pendingTeamInvites;

    return {
        allowsWrites,
        seats: {
            used: seatsUsed,
            limit: limits.seatsLimit,
            pendingInvites: pendingTeamInvites,
        },
        screenings: { used: screeningCount, limit: limits.screeningsLimit },
        screeningInvites: {
            usedInPeriod: screeningInvitesInPeriod,
            limit: limits.screeningInvitesLimit,
            period,
        },
    };
}

export async function assertCanAddFacilityTeamInvites(
    facilityId: string,
    inviteCount: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
    if (inviteCount <= 0) return { ok: true };

    const usage = await getFacilityEntitlementUsage(facilityId);
    if (!usage.allowsWrites) {
        return {
            ok: false,
            message: "Your subscription is inactive. Upgrade or renew to invite team members.",
        };
    }

    const limit = usage.seats.limit;
    if (isUnlimitedCap(limit)) return { ok: true };

    const remaining = limit - usage.seats.used;
    if (inviteCount > remaining) {
        return {
            ok: false,
            message:
                remaining <= 0
                    ? "You've reached your team seat limit. Remove a member or revoke a pending invite, or upgrade your plan."
                    : `You can only invite ${remaining} more team member${remaining === 1 ? "" : "s"} on your current plan.`,
        };
    }

    return { ok: true };
}

export async function assertCanCreateScreening(
    facilityId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const usage = await getFacilityEntitlementUsage(facilityId);
    if (!usage.allowsWrites) {
        return {
            ok: false,
            message: "Your subscription is inactive. Upgrade or renew to create screenings.",
        };
    }

    const limit = usage.screenings.limit;
    if (isUnlimitedCap(limit)) return { ok: true };

    if (usage.screenings.used >= limit) {
        return {
            ok: false,
            message: "You've reached your screening limit for this plan. Upgrade to create more.",
        };
    }

    return { ok: true };
}

export async function assertCanSendScreeningInvites(
    facilityId: string,
    count: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
    if (count <= 0) return { ok: true };

    const usage = await getFacilityEntitlementUsage(facilityId);
    if (!usage.allowsWrites) {
        return {
            ok: false,
            message: "Your subscription is inactive. Upgrade or renew to send screening invites.",
        };
    }

    const limit = usage.screeningInvites.limit;
    if (isUnlimitedCap(limit)) return { ok: true };

    const remaining = limit - usage.screeningInvites.usedInPeriod;
    if (count > remaining) {
        return {
            ok: false,
            message:
                remaining <= 0
                    ? "You've reached your screening invite limit for the current billing period. Upgrade your plan or wait until the next period."
                    : `You can send ${remaining} more screening invite${remaining === 1 ? "" : "s"} this billing period.`,
        };
    }

    return { ok: true };
}
