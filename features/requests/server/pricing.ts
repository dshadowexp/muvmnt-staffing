import "server-only";

import {
    PRICING_TIER_IDS,
    PRICING_TIER_PULSE,
    PRICING_TIER_VETERAN,
    PRICING_TIER_VETTED,
    type PricingTierId,
} from "../constants";
import {
    baselinePositionsForWeekday,
    getRegionalDemand,
} from "./surge";
import { getGoogleMapsClient } from "@/services/google-maps/client";
import { normalizeProfessionId } from "@/lib/professions";
import { cellToLatLng } from "h3-js";


/**
 * Dynamic, demand-driven pricing.
 *
 *   rate(tier) = base_prof
 *              × S_surge          (regional demand on the requested days)
 *              × M_day            (weekend / holiday weighting)
 *              × M_shift          (day / evening / night weighting)
 *              × M_lead           (how soon the first shift starts)
 *              × A_tier           (tier add-on multiplier)
 *
 * Everything but `S_surge` is computed from the request fields the server
 * already has — no candidate pool is built, no h3 ring is materialized. The
 * surge component is a single grouped SQL hit served by `./surge`, scoped to
 * the client's region and the requested date window.
 */

// ─── Tier shape (preserved for existing imports) ─────────────────────────────

export type PricingTier = {
    tierId: string;
    label: string;
    /** Short marketing one-liner shown under the tier label. */
    tagline: string;
    description: string;
    /** Lucide icon name for the UI. */
    icon: PricingTierIcon;
    /** Hourly **base** rate (CAD). Final total may grow if matching needs more workers. */
    hourlyRate: number;
    /** Cents form of `hourlyRate` so the UI doesn't have to round-trip the float. */
    hourlyRateCents: number;
    /** 0, 18, 25, 35 — the add-on percentage on top of `pulse` for this tier. */
    addOnPercent: number;
    /** Total billable hours for the request (positions × scheduled hours). */
    totalHours: number;
    /** Estimated total at this tier's rate, in cents. */
    totalEstimateCents: number;
    /** UI hints decided server-side. */
    recommended: boolean;
    badges: PricingTierBadge[];
    /**
     * Legacy compatibility. Pricing is now independent of the worker pool, but
     * existing UI consumers expect these. We surface "not available" as `false`
     * only for theoretical future tiers; in v1 every tier is always orderable.
     */
    candidateCount: number;
    available: boolean;
};

export type PricingTierIcon = "Activity" | "ShieldCheck" | "Medal" | "Anchor";

export type PricingTierBadge =
    | "high_demand"
    | "weekend"
    | "overnight"
    | "short_notice";

export type PricingMultipliers = {
    surge: number;
    dayMix: number;
    shiftMix: number;
    leadTime: number;
};

export type SurgeLevel = "low" | "neutral" | "rising" | "high";

export type PricingQuote = {
    currency: "CAD";
    /** Per-profession baseline before any multiplier. */
    baseRateProfession: number;
    /** `base × surge × dayMix × shiftMix × leadTime` — the floor under every tier. */
    dynamicBaseRate: number;
    multipliers: PricingMultipliers;
    surgeLevel: SurgeLevel;
    tiers: PricingTier[];
    /** ISO; pricing-page can soft-refresh after a TTL. */
    computedAt: string;
};

// ─── Public quote entry-point ────────────────────────────────────────────────

export type QuoteInput = {
    requestId: string;
    cellId: string;
    profession: string;
    positions: number;
    dailyWindows: { date: string; slots: { startTime: string; endTime: string }[] }[];
    now?: Date;
};

export async function quoteStaffRequest(input: QuoteInput): Promise<PricingQuote> {
    const now = input.now ?? new Date();
    const baseRate = professionBase(input.profession);
    const { startYmd, endYmd } = scheduleBounds(input.dailyWindows);

    const province = await getProvinceForCellId(input.cellId);
    const surge = await computeSurge({
        cellId: input.cellId,
        startYmd,
        endYmd,
        dailyWindows: input.dailyWindows,
        excludeRequestId: input.requestId,
    });
    const dayMix = computeDayMix(input.dailyWindows, province);
    const shiftMix = computeShiftMix(input.dailyWindows);
    const leadTime = computeLeadTime(input.dailyWindows, now);

    const dynamicBaseRate = baseRate * surge * dayMix * shiftMix * leadTime;
    const totalHours = totalBillableHours({
        profession: input.profession,
        positions: input.positions,
        dailyWindows: input.dailyWindows,
    });

    const tiers = PRICING_TIER_IDS.map((id) =>
        buildTier(id, dynamicBaseRate, totalHours, {
            surge,
            dayMix,
            shiftMix,
            leadTime,
        }, input.dailyWindows.length),
    );

    return {
        currency: "CAD",
        baseRateProfession: baseRate,
        dynamicBaseRate,
        multipliers: { surge, dayMix, shiftMix, leadTime },
        surgeLevel: surgeLevel(surge),
        tiers,
        computedAt: now.toISOString(),
    };
}

// ─── 1. Profession base rate ─────────────────────────────────────────────────

const PROF_BASE: Record<string, number> = {
    rn: 30,
    rpn: 27,
    allied_health_practitioner: 25,
    psw: 21,
    dsw: 22,
    healthcare_support_worker: 20,
    cook: 22,
    other: 19,
    unspecified: 19,
};

export function baseHourlyRateForProfession(profession: string): number {
    const id = normalizeProfessionId(profession);
    return PROF_BASE[id] ?? PROF_BASE.unspecified ?? 28;
}

function professionBase(profession: string): number {
    return baseHourlyRateForProfession(profession);
}

// ─── 2. Surge ────────────────────────────────────────────────────────────────

const SURGE_ALPHA = 0.35;
const SURGE_FLOOR = 1.0;
const SURGE_CEILING = 1.75;

async function computeSurge(args: {
    cellId: string;
    startYmd: string;
    endYmd: string;
    dailyWindows: QuoteInput["dailyWindows"];
    excludeRequestId?: string;
}): Promise<number> {
    if (!args.cellId || !args.startYmd || !args.endYmd) return 1;

    const snapshot = await getRegionalDemand({
        cellId: args.cellId,
        startYmd: args.startYmd,
        endYmd: args.endYmd,
        excludeRequestId: args.excludeRequestId,
    });

    let weighted = 0;
    let weightSum = 0;

    for (const day of args.dailyWindows) {
        const hours = sumSlotHours(day.slots);
        if (hours <= 0) continue;
        const weekday = weekdayFromYmd(day.date);
        const baseline = baselinePositionsForWeekday(weekday);
        const open = snapshot.perDay.get(day.date) ?? 0;
        const demand = baseline > 0 ? open / baseline : 0;
        const surge = clamp(
            1 + SURGE_ALPHA * Math.log1p(Math.max(0, demand - 1)),
            SURGE_FLOOR,
            SURGE_CEILING,
        );
        weighted += surge * hours;
        weightSum += hours;
    }

    if (weightSum === 0) return 1;
    return weighted / weightSum;
}

function surgeLevel(surge: number): SurgeLevel {
    if (surge < 1.05) return "low";
    if (surge < 1.15) return "neutral";
    if (surge < 1.35) return "rising";
    return "high";
}

// ─── 3. Day mix (weekend + holiday weighting) ────────────────────────────────

const DAY_WEIGHT: Record<number, number> = {
    0: 1.12, // Sunday
    1: 1.0,
    2: 1.0,
    3: 1.0,
    4: 1.0,
    5: 1.03, // Friday
    6: 1.08, // Saturday
};

const HOLIDAY_WEIGHT = 1.2;

/**
 * Statutory-holiday set per province. Static for v1 — small enough to ship
 * inline, big enough to be useful. Dates are yyyy-mm-dd.
 */
const STAT_HOLIDAYS: Record<string, Set<string>> = {
    // Federal + ON 2026 — extend as the catalog grows.
    ON: new Set([
        "2026-01-01",
        "2026-02-16",
        "2026-04-03",
        "2026-05-18",
        "2026-07-01",
        "2026-08-03",
        "2026-09-07",
        "2026-09-30",
        "2026-10-12",
        "2026-12-25",
        "2026-12-26",
    ]),
};

/** Google `administrative_area_level_1` long names → codes used in `STAT_HOLIDAYS`. */
const CA_ADMIN_AREA_LONG_TO_CODE: Record<string, string> = {
    Ontario: "ON",
    Quebec: "QC",
    "British Columbia": "BC",
    Alberta: "AB",
    Manitoba: "MB",
    Saskatchewan: "SK",
    "Nova Scotia": "NS",
    "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL",
    "Prince Edward Island": "PE",
    "Northwest Territories": "NT",
    Nunavut: "NU",
    Yukon: "YT",
};

/**
 * Resolves a Canadian province/territory code (e.g. ON) via reverse geocoding.
 * Returns `undefined` outside Canada, on lookup miss, or if the API fails.
 */
async function getProvinceForCellId(
    cellId: string,
): Promise<string | undefined> {
    try {
        const [lat, lng] = cellToLatLng(cellId);
        const result = await getGoogleMapsClient.reverseGeocode(lat, lng);
        if (result.components.countryCode?.toUpperCase() !== "CA") return undefined;
        const admin1 = result.components.state?.trim();
        if (!admin1) return undefined;
        return CA_ADMIN_AREA_LONG_TO_CODE[admin1];
    } catch {
        return undefined;
    }
}

function computeDayMix(
    dailyWindows: QuoteInput["dailyWindows"],
    province?: string,
): number {
    const holidays = province ? (STAT_HOLIDAYS[province] ?? null) : null;
    let weighted = 0;
    let weightSum = 0;

    for (const day of dailyWindows) {
        const hours = sumSlotHours(day.slots);
        if (hours <= 0) continue;
        const weekday = weekdayFromYmd(day.date);
        const isHoliday = holidays?.has(day.date) ?? false;
        const w = isHoliday ? HOLIDAY_WEIGHT : (DAY_WEIGHT[weekday] ?? 1);
        weighted += w * hours;
        weightSum += hours;
    }
    return weightSum === 0 ? 1 : weighted / weightSum;
}

// ─── 4. Shift mix (day / evening / night) ────────────────────────────────────

const SHIFT_WEIGHT = { day: 1.0, evening: 1.06, night: 1.15 } as const;

function computeShiftMix(dailyWindows: QuoteInput["dailyWindows"]): number {
    let weighted = 0;
    let weightSum = 0;

    for (const day of dailyWindows) {
        for (const slot of day.slots) {
            const split = splitByPeriod(slot.startTime, slot.endTime);
            for (const [period, hours] of split) {
                if (hours <= 0) continue;
                weighted += SHIFT_WEIGHT[period] * hours;
                weightSum += hours;
            }
        }
    }
    return weightSum === 0 ? 1 : weighted / weightSum;
}

type ShiftPeriod = "day" | "evening" | "night";

const PERIOD_BANDS: { period: ShiftPeriod; from: number; to: number }[] = [
    { period: "night", from: 0, to: 6 * 60 }, // 00:00–06:00
    { period: "day", from: 6 * 60, to: 18 * 60 }, // 06:00–18:00
    { period: "evening", from: 18 * 60, to: 22 * 60 }, // 18:00–22:00
    { period: "night", from: 22 * 60, to: 24 * 60 }, // 22:00–24:00
];

/** Splits a slot into (period → hours) entries. Handles slots that span midnight. */
function splitByPeriod(start: string, end: string): [ShiftPeriod, number][] {
    const startM = toMinutes(start);
    let endM = toMinutes(end);
    if (endM <= startM) endM += 24 * 60; // overnight

    const acc: Record<ShiftPeriod, number> = { day: 0, evening: 0, night: 0 };
    let cursor = startM;

    while (cursor < endM) {
        const localCursor = cursor % (24 * 60);
        const band = PERIOD_BANDS.find(
            (b) => localCursor >= b.from && localCursor < b.to,
        )!;
        const localBandEnd = band.to;
        const advance = Math.min(endM - cursor, localBandEnd - localCursor);
        acc[band.period] += advance / 60;
        cursor += advance;
    }
    return (Object.entries(acc) as [ShiftPeriod, number][]).filter(
        ([, h]) => h > 0,
    );
}

// ─── 5. Lead time ────────────────────────────────────────────────────────────

function computeLeadTime(
    dailyWindows: QuoteInput["dailyWindows"],
    now: Date,
): number {
    if (dailyWindows.length === 0) return 1;

    const earliest = earliestShiftStart(dailyWindows);
    if (!earliest) return 1;

    const hoursUntil = (earliest.getTime() - now.getTime()) / 3_600_000;

    if (hoursUntil >= 14 * 24) return 1.0;
    if (hoursUntil >= 7 * 24) return 1.03;
    if (hoursUntil >= 3 * 24) return 1.08;
    if (hoursUntil >= 24) return 1.18;
    return 1.3;
}

function earliestShiftStart(
    dailyWindows: QuoteInput["dailyWindows"],
): Date | null {
    let earliest: Date | null = null;
    for (const day of dailyWindows) {
        if (!day.date) continue;
        for (const slot of day.slots) {
            const iso = `${day.date}T${slot.startTime}:00`;
            const t = new Date(iso);
            if (!Number.isFinite(t.getTime())) continue;
            if (!earliest || t < earliest) earliest = t;
        }
    }
    return earliest;
}

// ─── 6. Tier add-ons + builder ───────────────────────────────────────────────

const TIER_ADDON: Record<PricingTierId, number> = {
    [PRICING_TIER_PULSE]: 0,
    [PRICING_TIER_VETTED]: 0.18,
    [PRICING_TIER_VETERAN]: 0.25,
};

const TIER_ICON: Record<PricingTierId, PricingTierIcon> = {
    [PRICING_TIER_PULSE]: "Activity",
    [PRICING_TIER_VETTED]: "ShieldCheck",
    [PRICING_TIER_VETERAN]: "Medal",
};

/**
 * Default copy. The pricing-page UI overrides these via i18n at render time;
 * this default keeps server-only consumers (tests, future emails, etc.) usable.
 */
const TIER_DEFAULT_COPY: Record<
    PricingTierId,
    { label: string; tagline: string; description: string }
> = {
    [PRICING_TIER_PULSE]: {
        label: "Pulse",
        tagline: "Live market rate",
        description:
            "Demand-priced base rate for the days you've selected. Adjusts with regional staffing pressure.",
    },
    [PRICING_TIER_VETTED]: {
        label: "Vetted",
        tagline: "Top-tier training & full vetting",
        description:
            "Workers who have completed enhanced vetting and verified credentials.",
    },
    [PRICING_TIER_VETERAN]: {
        label: "Veteran",
        tagline: "10+ years on the floor",
        description:
            "Highly experienced workers with a long track record in your setting.",
    },
};

function buildTier(
    tierId: PricingTierId,
    dynamicBaseRate: number,
    totalHours: number,
    multipliers: PricingMultipliers,
    dayCount: number,
): PricingTier {
    const addOn = TIER_ADDON[tierId];
    const rawRate = dynamicBaseRate * (1 + addOn);
    const hourlyRate = roundQuarterDollar(rawRate);
    const hourlyRateCents = Math.round(hourlyRate * 100);
    const totalEstimateCents = Math.round(totalHours * hourlyRate * 100);
    const copy = TIER_DEFAULT_COPY[tierId];

    return {
        tierId,
        label: copy.label,
        tagline: copy.tagline,
        description: copy.description,
        icon: TIER_ICON[tierId],
        hourlyRate,
        hourlyRateCents,
        addOnPercent: Math.round(addOn * 100),
        totalHours,
        totalEstimateCents,
        recommended: isRecommended(tierId, multipliers, dayCount),
        badges: badgesFor(multipliers),
        candidateCount: 0,
        available: true,
    };
}

function isRecommended(
    tierId: PricingTierId,
    m: PricingMultipliers,
    dayCount: number,
): boolean {
    if (tierId === PRICING_TIER_PULSE) return m.surge < 1.1 && m.leadTime < 1.1;
    if (tierId === PRICING_TIER_VETTED) return dayCount > 4;
    return false;
}

function badgesFor(m: PricingMultipliers): PricingTierBadge[] {
    const out: PricingTierBadge[] = [];
    if (m.surge >= 1.3) out.push("high_demand");
    if (m.dayMix >= 1.06) out.push("weekend");
    if (m.shiftMix >= 1.1) out.push("overnight");
    if (m.leadTime >= 1.15) out.push("short_notice");
    return out;
}

// ─── Hours / billable helpers (kept for existing imports) ────────────────────

export type PricingDraft = {
    profession: string;
    positions: number;
    dailyWindows: { date: string; slots: { startTime: string; endTime: string }[] }[];
};

function normTime(t: string): { h: number; m: number } {
    const [h = "0", m = "0"] = t.split(":");
    return { h: Number(h), m: Number(m) };
}

export function hoursBetween(start: string, end: string): number {
    const s = normTime(start);
    const e = normTime(end);
    return Math.max(0, (e.h * 60 + e.m - s.h * 60 - s.m) / 60);
}

export function totalBillableHours(draft: PricingDraft): number {
    const pos = Math.max(1, draft.positions);
    let hours = 0;
    for (const day of draft.dailyWindows) {
        hours += sumSlotHours(day.slots);
    }
    return hours * pos;
}

export function estimatedTotalCents(
    draft: PricingDraft,
    hourlyRate: number,
): number {
    return Math.round(totalBillableHours(draft) * hourlyRate * 100);
}

// ─── Shared utilities ────────────────────────────────────────────────────────

function sumSlotHours(slots: { startTime: string; endTime: string }[]): number {
    let h = 0;
    for (const s of slots) h += hoursBetween(s.startTime, s.endTime);
    return h;
}

function scheduleBounds(
    dailyWindows: QuoteInput["dailyWindows"],
): { startYmd: string; endYmd: string } {
    let lo: string | null = null;
    let hi: string | null = null;
    for (const d of dailyWindows) {
        if (!d.date) continue;
        if (!lo || d.date < lo) lo = d.date;
        if (!hi || d.date > hi) hi = d.date;
    }
    return { startYmd: lo ?? "", endYmd: hi ?? lo ?? "" };
}

function toMinutes(t: string): number {
    const { h, m } = normTime(t);
    return h * 60 + m;
}

function weekdayFromYmd(ymd: string): number {
    const d = new Date(`${ymd}T00:00:00Z`);
    return d.getUTCDay();
}

function clamp(n: number, lo: number, hi: number): number {
    if (n < lo) return lo;
    if (n > hi) return hi;
    return n;
}

function roundQuarterDollar(n: number): number {
    return Math.round(n * 4) / 4;
}
