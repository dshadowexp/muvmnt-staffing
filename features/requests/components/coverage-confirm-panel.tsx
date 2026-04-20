"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
    estimatedTotalCentsForHourly,
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
    /** Pre-built draft used for the "full schedule" estimate fallback. */
    fullSchedule: {
        startIso: string;
        endIso: string | null;
        positions: number;
        dailyWindows: { date: string; slots: { startTime: string; endTime: string }[] }[];
    };
    /** Whether the client has a saved card on file. Drives confirm copy. */
    hasSavedPaymentMethod: boolean;
    /** ISO timestamp of the cache, surfaced so users know how recent it is. */
    cachedAtIso: string | null;
};

type ChargeRunState =
    | { kind: "idle" }
    | { kind: "running"; runId: string; publicAccessToken: string };

/**
 * Read-only coverage display + confirm CTA.
 *
 * The confirm action either:
 *   - kicks off `staff-requests.confirm-and-charge` (saved card) and switches
 *     into a realtime tracker until the run finishes, then redirects to the
 *     completed-request page; or
 *   - opens a Stripe Checkout session in the same tab.
 */
export function CoverageConfirmPanel({
    requestId,
    cache,
    fullSchedule,
    hasSavedPaymentMethod,
    cachedAtIso,
}: CoverageConfirmPanelProps) {
    const t = useTranslations("staffRequest.wizard");
    const [pending, startTransition] = useTransition();
    const [chargeRun, setChargeRun] = useState<ChargeRunState>({ kind: "idle" });

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

    const fullTotalCents = useMemo(() => {
        if (!Number.isFinite(rate) || rate <= 0) return null;
        return estimatedTotalCentsForHourly(
            {
                positions: fullSchedule.positions,
                dailyWindows: fullSchedule.dailyWindows,
            },
            rate,
        );
    }, [fullSchedule, rate]);

    const hasAssigned = cache.schedule.some((d) => d.assignments.length > 0);
    const canConfirm =
        hasAssigned && coverageHours > 0 && Number.isFinite(rate) && rate > 0;

    function handleConfirm() {
        startTransition(async () => {
            const result = await confirmStaffRequestAction(requestId);
            if (result.error) {
                toast.error(result.message);
                return;
            }
            if (result.mode === "checkout") {
                window.location.href = result.url;
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
        <div className="flex flex-col gap-6">
            <CoverageSchedule
                schedule={cache.schedule}
                fullyCovered={cache.fullyCovered}
                candidateCount={cache.candidateCount}
            />

            <div
                className={cn(
                    "rounded-2xl border-2 p-5 sm:p-6",
                    coverageTotalCents != null
                        ? "border-primary/45 bg-primary/5 shadow-sm"
                        : "border-border bg-muted/20",
                )}
                aria-live="polite"
            >
                <div className="grid gap-6 sm:grid-cols-2 sm:items-end sm:gap-8">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">
                            {t("hourlyRate")}
                        </p>
                        {Number.isFinite(rate) && rate > 0 ? (
                            <p className="text-foreground mt-2 text-lg tracking-tight tabular-nums sm:text-xl">
                                {formatMoney(Math.round(rate * 100), currency)}
                                <span className="text-muted-foreground ml-1 text-base font-semibold sm:text-lg">
                                    {t("perHour")}
                                </span>
                            </p>
                        ) : (
                            <p className="text-muted-foreground mt-2 text-2xl font-semibold tabular-nums">
                                —
                            </p>
                        )}
                    </div>
                    <div className="sm:text-right">
                        <p className="text-muted-foreground text-sm font-medium">
                            {t("total")}
                        </p>
                        {coverageTotalCents != null ? (
                            <div className="mt-2 space-y-1">
                                <p className="text-foreground text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
                                    {formatMoney(coverageTotalCents, currency)}
                                </p>
                                {!cache.fullyCovered &&
                                fullTotalCents != null &&
                                fullTotalCents !== coverageTotalCents ? (
                                    <p className="text-muted-foreground text-xs tabular-nums sm:text-sm">
                                        {t("fullScheduleEstimate", {
                                            amount: formatMoney(
                                                fullTotalCents,
                                                currency,
                                            ),
                                        })}
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-muted-foreground mt-2 text-2xl font-semibold tabular-nums">
                                —
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {cachedAtIso ? (
                <p className="text-muted-foreground text-xs">
                    {t("cachedAt", {
                        relative: relativeMinutes(cachedAtIso, t),
                    })}
                </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                    type="button"
                    size="lg"
                    disabled={!canConfirm || pending}
                    onClick={handleConfirm}
                    className="min-w-44"
                >
                    <LoadingSwap isLoading={pending}>
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck className="size-4" aria-hidden />
                            {hasSavedPaymentMethod
                                ? t("confirmAndCharge")
                                : t("confirmAndCheckout")}
                        </span>
                    </LoadingSwap>
                </Button>
            </div>
        </div>
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
