"use client";

import {
    Activity,
    Anchor,
    Medal,
    ShieldCheck,
    Sparkles,
    type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    PRICING_TIER_PULSE,
    PRICING_TIER_RESERVE,
    PRICING_TIER_VETERAN,
    PRICING_TIER_VETTED,
} from "../constants";

/**
 * Tier-id → icon. Only the active (v1) dynamic-pricing tiers are mapped
 * here; legacy IDs (`standard`, `same_profession`, `credentialed`) fall
 * through to a neutral icon so old rows don't crash the page.
 */
const TIER_ICON_BY_ID: Record<string, LucideIcon> = {
    [PRICING_TIER_PULSE]: Activity,
    [PRICING_TIER_VETTED]: ShieldCheck,
    [PRICING_TIER_VETERAN]: Medal,
    [PRICING_TIER_RESERVE]: Anchor,
};

/** Display labels for the active tiers also live in i18n; this map only
 * exists as a safety net for unknown / legacy tier IDs. */
const TIER_FALLBACK_LABEL: Record<string, string> = {
    standard: "Standard",
    same_profession: "Same profession",
    credentialed: "Credentialed",
};

const ACTIVE_TIER_IDS = new Set<string>([
    PRICING_TIER_PULSE,
    PRICING_TIER_VETTED,
    PRICING_TIER_VETERAN,
    PRICING_TIER_RESERVE,
]);

function formatMoney(cents: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(cents / 100);
}

export type SelectedPricingTierCardProps = {
    /** Tier id stored on `staff_requests.pricing_tier`. */
    tierId: string;
    /** Hourly rate in dollars (matches `staff_requests.pricing_rate`). */
    hourlyRate: number;
    /** ISO currency code; we only ship CAD today but the prop keeps it open. */
    currency: string;
};

/**
 * Compact summary of the tier the client picked on the pricing step. Rendered
 * on the coverage page so the user can see what they're paying for while
 * matching runs and at the confirm step.
 */
export function SelectedPricingTierCard({
    tierId,
    hourlyRate,
    currency,
}: SelectedPricingTierCardProps) {
    const t = useTranslations("staffRequest.wizard");
    const tTier = useTranslations("staffRequest.tiers");
    const locale = useLocale();

    const Icon = TIER_ICON_BY_ID[tierId] ?? Sparkles;
    const isActive = ACTIVE_TIER_IDS.has(tierId);

    const label = isActive
        ? tTier(`${tierId}.label` as never)
        : TIER_FALLBACK_LABEL[tierId] ?? tierId;
    const tagline = isActive ? tTier(`${tierId}.tagline` as never) : null;

    const hourlyRateCents =
        Number.isFinite(hourlyRate) && hourlyRate > 0
            ? Math.round(hourlyRate * 100)
            : null;

    return (
        <Card className="border-border/80 overflow-hidden py-0">
            <CardContent className="flex items-center gap-4 p-4">
                <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden
                >
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-foreground text-sm font-semibold">
                            {label}
                        </p>
                        <Badge
                            variant="secondary"
                            className="bg-primary/15 text-primary border-primary/25"
                        >
                            {t("selectedTier")}
                        </Badge>
                    </div>
                    {tagline ? (
                        <p className="text-muted-foreground text-xs">
                            {tagline}
                        </p>
                    ) : null}
                </div>
                <div className="text-right">
                    {hourlyRateCents != null ? (
                        <p className="text-foreground text-base font-bold tabular-nums">
                            {formatMoney(hourlyRateCents, currency, locale)}
                        </p>
                    ) : (
                        <p className="text-muted-foreground text-base font-bold tabular-nums">
                            —
                        </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                        {t("perHour")}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
