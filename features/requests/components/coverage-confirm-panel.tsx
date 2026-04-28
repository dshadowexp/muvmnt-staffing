"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    CircleDashedIcon,
    CreditCard,
    Receipt,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { setupBillingPortalAction } from "@/features/billing/actions";
import {
    TriggerAuthContext,
    useRealtimeRun,
} from "@trigger.dev/react-hooks";
import type { AnyTask } from "@trigger.dev/core/v3";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { cn } from "@/lib/utils";
import {
    estimatedCoverageTotalCentsForHourly,
    totalCoveredHoursFromMatchSchedule,
} from "../pricing/staff-request-pricing";
import type { ConfirmAndChargeProgress } from "@/trigger/staff-requests/confirm-and-charge";
import type { CoverageDataCache } from "../server/staff-request";
import { confirmStaffRequestAction } from "../server/actions";
import { CoverageSchedule } from "./coverage-schedule";

function formatMoney(cents: number, currency: string) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
    }).format(cents / 100);
}

export type CoverageConfirmPanelProps = {
    requestId: string;
    cache: CoverageDataCache;
    /** Saved cards for this client (from Stripe). */
    hasPaymentMethods: boolean;
    /** ISO timestamp of the cache, surfaced so users know how recent it is. */
    cachedAtIso: string | null;
};

type ChargeRunState =
    | { kind: "idle" }
    | { kind: "running"; runId: string; publicAccessToken: string };

/**
 * Read-only coverage display + confirm CTA.
 *
 * Confirm is only enabled once a default payment method is on file; the action
 * runs `staff-requests.confirm-and-charge` with that default.
 */
export function CoverageConfirmPanel({
    requestId,
    cache,
    hasPaymentMethods,
    cachedAtIso,
}: CoverageConfirmPanelProps) {
    const t = useTranslations("staffRequest.wizard");
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [backPending, startBackTransition] = useTransition();
    const [chargeRun, setChargeRun] = useState<ChargeRunState>({ kind: "idle" });
    const [isBillingSetup, setIsBillingSetup] = useState(hasPaymentMethods);

    useEffect(() => {
        setIsBillingSetup(hasPaymentMethods);
    }, [hasPaymentMethods]);

    const rate = cache.pricingRate ?? 0;
    const currency = cache.currency ?? "CAD";

    const coverageHours = useMemo(
        () => totalCoveredHoursFromMatchSchedule(cache.schedule),
        [cache.schedule],
    );
    const coverageTotalCents = useMemo(() => {
        if (!Number.isFinite(rate) || rate <= 0) return null;
        return estimatedCoverageTotalCentsForHourly(cache.schedule, rate);
    }, [cache.schedule, rate]);

    const hasAssigned = cache.schedule.some((d) => d.assignments.length > 0);
    const canConfirm =
        hasAssigned && coverageHours > 0 && Number.isFinite(rate) && rate > 0;

    const navLocked = pending || backPending;

    function handleBackToPricing() {
        startBackTransition(() => {
            router.push(
                `/dashboard/requests/${requestId}/pricing` as Parameters<
                    typeof router.push
                >[0],
            );
        });
    }

    function handleConfirm() {
        startTransition(async () => {
            const result = await confirmStaffRequestAction(requestId);
            if (result.error) {
                toast.error(result.message);
                return;
            }

            setChargeRun({
                kind: "running",
                runId: result.runId,
                publicAccessToken: result.publicAccessToken,
            });
        });
    }

    if (chargeRun.kind === "running") {
        return (
            <TriggerAuthContext.Provider
                value={{ accessToken: chargeRun.publicAccessToken }}
            >
                <ChargeRunTracker requestId={requestId} runId={chargeRun.runId} />
            </TriggerAuthContext.Provider>
        );
    }

    return (
        <div className="flex flex-col gap-6 mb-20">
            <CoverageSchedule
                schedule={cache.schedule}
                fullyCovered={cache.fullyCovered}
                candidateCount={cache.candidateCount}
            />

            {canConfirm ? (
                <div
                    className={cn(
                        "rounded-2xl border-2 p-5 sm:p-6",
                        coverageTotalCents != null
                            ? "border-primary/45 bg-primary/5 shadow-sm"
                            : "border-border bg-muted/20",
                    )}
                    aria-live="polite"
                >
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <p className="text-muted-foreground text-sm font-medium">
                                {t("agreedHourlyRate")}
                            </p>
                            {Number.isFinite(rate) && rate > 0 ? (
                                <p className="text-foreground text-right text-2xl font-bold tracking-tight tabular-nums">
                                    {formatMoney(Math.round(rate * 100), currency)}
                                    <span className="text-muted-foreground ml-1.5 text-lg font-semibold">
                                        {t("perHour")}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-2xl font-bold tabular-nums">
                                    —
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border/60 pt-5">
                            <p className="text-muted-foreground text-sm font-medium">
                                {t("amountDueToday")}
                            </p>
                            <p className="text-foreground text-right text-sm font-semibold tracking-tight tabular-nums sm:text-sm">
                                {formatMoney(0, currency)}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border/60 pt-5">
                            <p className="text-muted-foreground text-sm font-medium">
                                {t("estimatedTotalOnCompletion")}
                            </p>
                            {coverageTotalCents != null ? (
                                <p className="text-foreground text-right text-sm font-semibold tracking-tight tabular-nums sm:text-sm">
                                    {formatMoney(coverageTotalCents, currency)}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-2xl font-bold tabular-nums">
                                    —
                                </p>
                            )}
                        </div>
                    </div>
                </div>
               ) : null}

            {cachedAtIso ? (
                <p className="text-muted-foreground text-xs">
                    {t("cachedAt", {
                        relative: relativeMinutes(cachedAtIso, t),
                    })}
                </p>
            ) : null}

            {canConfirm ? (
                isBillingSetup ? (
                    <div
                        className="rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm"
                        role="status"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Receipt
                                    className="size-5"
                                    aria-hidden
                                />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-foreground text-sm font-semibold">
                                    {t("coverageBillingInvoiceTitle")}
                                </p>
                                <p className="text-muted-foreground text-sm leading-snug">
                                    {t("coverageBillingInvoiceDescription")}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className={cn(
                            "flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm",
                            navLocked && "pointer-events-none opacity-60",
                        )}
                    >
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-foreground text-sm font-semibold">
                                {t("coverageSetupBillingTitle")}
                            </p>
                            <p className="text-muted-foreground text-sm leading-snug">
                                {t("coverageSetupBillingDescription")}
                            </p>
                        </div>
                        <form
                            action={setupBillingPortalAction}
                            className="shrink-0"
                        >
                            <CoverageBillingPortalButton
                                navLocked={navLocked}
                            />
                        </form>
                    </div>
                )
            ) : null}

            <div className="flex w-full flex-wrap items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={navLocked}
                    onClick={handleBackToPricing}
                    className="shrink-0"
                >
                    <LoadingSwap isLoading={backPending}>
                        <span className="inline-flex items-center gap-2">
                            <ArrowLeft className="size-4" aria-hidden />
                            {t("backToPricing")}
                        </span>
                    </LoadingSwap>
                </Button>
                <Button
                    type="button"
                    size="lg"
                    disabled={
                        !canConfirm ||
                        navLocked ||
                        !isBillingSetup
                    }
                    onClick={handleConfirm}
                    className="ml-auto min-w-44 shrink-0"
                >
                    <LoadingSwap isLoading={pending}>
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck className="size-4" aria-hidden />
                            {t("confirmAndCharge")}
                        </span>
                    </LoadingSwap>
                </Button>
            </div>
        </div>
    );
}

function CoverageBillingPortalButton({ navLocked }: { navLocked: boolean }) {
    const { pending } = useFormStatus();
    const tBill = useTranslations("dashboard.client.billing");
    return (
        <Button
            type="submit"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            disabled={pending || navLocked}
            aria-label={tBill("manageBilling")}
        >
            {pending ? (
                <CircleDashedIcon
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden
                />
            ) : (
                <CreditCard className="size-5" aria-hidden />
            )}
        </Button>
    );
}

function relativeMinutes(
    iso: string,
    t: ReturnType<typeof useTranslations>,
): string {
    const minutes = Math.max(
        0,
        Math.round((Date.now() - Date.parse(iso)) / 60_000),
    );
    if (minutes < 1) return t("justNow");
    return t("minutesAgo", { minutes });
}

function ChargeRunTracker({
    requestId,
    runId,
}: {
    requestId: string;
    runId: string;
}) {
    const t = useTranslations("staffRequest.wizard");
    // `useRealtimeRun` only ever reads `run.status` + `run.metadata.progress`
    // here, so we widen to `AnyTask` to side-step the duplicated brand-symbol
    // mismatch between the nested `@trigger.dev/core` copies shipped by
    // `@trigger.dev/sdk` vs `@trigger.dev/react-hooks` (no real type info lost).
    const { run, error } = useRealtimeRun<AnyTask>(runId);
    const progress = run?.metadata?.progress as
        | ConfirmAndChargeProgress
        | undefined;
    const failed =
        run?.status === "FAILED" ||
        run?.status === "CRASHED" ||
        run?.status === "CANCELED" ||
        progress?.step === "failed";
    const done = run?.status === "COMPLETED" || progress?.step === "done";

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
                {failed ? (
                    <XCircle
                        className="size-5 text-destructive"
                        aria-hidden
                    />
                ) : done ? (
                    <CheckCircle2
                        className="size-5 text-emerald-500"
                        aria-hidden
                    />
                ) : (
                    <span
                        className="size-3 animate-pulse rounded-full bg-primary"
                        aria-hidden
                    />
                )}
                <p className="text-foreground text-base font-semibold">
                    {progress?.label ?? t("confirmStarting")}
                </p>
            </div>
            {progress?.detail ? (
                <p className="text-muted-foreground text-sm">
                    {progress.detail}
                </p>
            ) : null}
            {error ? (
                <p className="text-destructive text-sm">{error.message}</p>
            ) : null}
            {done && !failed ? (
                <a
                    className="text-primary text-sm font-medium underline-offset-2 hover:underline"
                    href={`/dashboard/requests/${requestId}`}
                >
                    {t("viewConfirmedRequest")}
                </a>
            ) : null}
        </div>
    );
}
