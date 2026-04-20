"use client";

import { useState, useTransition } from "react";
import {
    Activity,
    Anchor,
    ArrowLeft,
    ArrowRight,
    Flame,
    Medal,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
    TrendingUp,
    type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { cn } from "@/lib/utils";

import type {
    PricingQuote,
    PricingTier,
    PricingTierBadge,
    PricingTierIcon,
} from "../server/pricing";
import { applyStaffRequestPricingAction } from "../server/actions";

function formatMoney(cents: number, currency: string, locale: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(cents / 100);
}

const TIER_ICON_MAP: Record<PricingTierIcon, LucideIcon> = {
    Activity,
    ShieldCheck,
    Medal,
    Anchor,
};

const BADGE_ICON_MAP: Record<PricingTierBadge, LucideIcon> = {
    high_demand: Flame,
    weekend: Sun,
    overnight: Moon,
    short_notice: Sparkles,
};

export type PricingTierPickerProps = {
    requestId: string;
    quote: PricingQuote;
};

export function PricingTierPicker({ requestId, quote }: PricingTierPickerProps) {
    const t = useTranslations("staffRequest.wizard");
    const tTier = useTranslations("staffRequest.tiers");
    const locale = useLocale();
    const router = useRouter();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [continuePending, startContinueTransition] = useTransition();
    const [backPending, startBackTransition] = useTransition();

    const selected =
        quote.tiers.find((tier) => tier.tierId === selectedId) ?? null;

    function handleBackToSchedule() {
        startBackTransition(() => {
            router.push(
                "/dashboard/requests/new" as Parameters<typeof router.push>[0],
            );
        });
    }

    function handleContinue() {
        if (!selected) return;
        startContinueTransition(async () => {
            const result = await applyStaffRequestPricingAction({
                requestId,
                tierId: selected.tierId,
                hourlyRate: selected.hourlyRate,
            });
            if (result.error) {
                toast.error(result.message);
                return;
            }
            router.push(
                `/dashboard/requests/${requestId}/coverage` as Parameters<
                    typeof router.push
                >[0],
            );
        });
    }

    if (!quote.tiers.length) {
        return <p className="text-muted-foreground text-sm">{t("noTiers")}</p>;
    }

    // Once the user clicks "View coverage" (or "Back to schedule"), freeze the
    // tier grid: the request has a tier locked-in and is being persisted, so
    // letting the user re-pick would either race the action or apply to the
    // wrong row after navigation.
    const tiersLocked = continuePending || backPending;

    return (
        <div className="flex flex-col gap-6">
            {quote.surgeLevel !== "neutral" && quote.surgeLevel !== "low" ? (
                <SurgeRibbon level={quote.surgeLevel} />
            ) : null}

            <ul
                className="grid gap-3 sm:grid-cols-2"
                aria-busy={tiersLocked || undefined}
            >
                {quote.tiers.map((tier) => (
                    <TierCard
                        key={tier.tierId}
                        tier={tier}
                        currency={quote.currency}
                        locale={locale}
                        selected={selectedId === tier.tierId}
                        disabled={tiersLocked}
                        onSelect={() => setSelectedId(tier.tierId)}
                        labelOverride={tTier(`${tier.tierId}.label` as TierKey)}
                        taglineOverride={tTier(
                            `${tier.tierId}.tagline` as TierKey,
                        )}
                        badgeLabel={(badge) =>
                            tTier(`badges.${badge}` as TierKey)
                        }
                        recommendedLabel={tTier("recommended" as TierKey)}
                        perHour={t("perHour")}
                    />
                ))}
            </ul>

            <p className="text-muted-foreground text-xs">
                {tTier("priceLockNote")}
            </p>

            <div className="flex w-full flex-wrap items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={continuePending || backPending}
                    onClick={handleBackToSchedule}
                    className="shrink-0"
                >
                    <LoadingSwap isLoading={backPending}>
                        <span className="inline-flex items-center gap-2">
                            <ArrowLeft className="size-4" aria-hidden />
                            {t("backToSchedule")}
                        </span>
                    </LoadingSwap>
                </Button>
                <Button
                    type="button"
                    size="lg"
                    disabled={!selected || continuePending || backPending}
                    onClick={handleContinue}
                    className="ml-auto shrink-0"
                >
                    <LoadingSwap isLoading={continuePending}>
                        <span className="inline-flex items-center gap-2">
                            {t("viewCoverage")}
                            <ArrowRight className="size-4" />
                        </span>
                    </LoadingSwap>
                </Button>
            </div>
        </div>
    );
}

type TierKey = string;

type TierCardProps = {
    tier: PricingTier;
    currency: string;
    locale: string;
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
    labelOverride: string;
    taglineOverride: string;
    badgeLabel: (badge: PricingTierBadge) => string;
    recommendedLabel: string;
    perHour: string;
};

function TierCard({
    tier,
    currency,
    locale,
    selected,
    disabled = false,
    onSelect,
    labelOverride,
    taglineOverride,
    badgeLabel,
    recommendedLabel,
    perHour,
}: TierCardProps) {
    const Icon = TIER_ICON_MAP[tier.icon];
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                aria-pressed={selected}
                disabled={disabled}
                className={cn(
                    "flex h-full w-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left outline-none",
                    "transition-[transform,box-shadow,background-color,opacity] duration-200 ease-out",
                    "focus-visible:ring-2 focus-visible:ring-ring/60",
                    !disabled &&
                        "hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md active:translate-y-0 active:scale-[0.99] active:shadow-sm",
                    selected &&
                        !disabled &&
                        "border-primary bg-primary/5 shadow-md ring-2 ring-primary/25 hover:bg-primary/10 hover:shadow-lg",
                    selected &&
                        disabled &&
                        "border-primary bg-primary/5 shadow-md ring-2 ring-primary/25",
                    disabled &&
                        "cursor-not-allowed opacity-60",
                    disabled && !selected && "opacity-50",
                )}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 text-primary",
                        )}
                        aria-hidden
                    >
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-foreground text-base font-semibold">
                                {labelOverride}
                            </p>
                            {tier.recommended ? (
                                <Badge
                                    variant="secondary"
                                    className="bg-primary/15 text-primary border-primary/25"
                                >
                                    {recommendedLabel}
                                </Badge>
                            ) : null}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {taglineOverride}
                        </p>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                    <div className="flex items-baseline gap-2">
                        <p className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
                            {formatMoney(tier.hourlyRateCents, currency, locale)}
                        </p>
                        <span className="text-muted-foreground text-sm font-semibold">
                            {perHour}
                        </span>
                    </div>

                    {tier.badges.length > 0 ? (
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                            {tier.badges.map((badge) => {
                                const BadgeIcon = BADGE_ICON_MAP[badge];
                                return (
                                    <li key={badge}>
                                        <span className="text-muted-foreground bg-muted/60 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
                                            <BadgeIcon
                                                className="size-3"
                                                aria-hidden
                                            />
                                            {badgeLabel(badge)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
            </button>
        </li>
    );
}

function SurgeRibbon({ level }: { level: "rising" | "high" }) {
    const t = useTranslations("staffRequest.tiers.surge");
    return (
        <div
            className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                level === "high"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                    : "border-primary/30 bg-primary/5 text-foreground",
            )}
            role="status"
        >
            <TrendingUp className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-0.5">
                <p className="font-medium">{t(level === "high" ? "highTitle" : "risingTitle")}</p>
                <p className="text-muted-foreground text-xs">
                    {t(level === "high" ? "highDetail" : "risingDetail")}
                </p>
            </div>
        </div>
    );
}
