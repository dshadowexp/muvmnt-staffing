"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    CircleDashedIcon,
    CreditCard,
    Plus,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
    TriggerAuthContext,
    useRealtimeRun,
} from "@trigger.dev/react-hooks";
import type { AnyTask } from "@trigger.dev/core/v3";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AddPaymentMethodForm } from "@/features/payments/billing/components/add-payment-method-form";
import type { PaymentMethodCardType } from "@/features/payments/billing/types";
import {
    createSetupIntent,
    setDefaultPayment,
} from "@/features/payments/billing/dal/mutations";
import getStripeBrowser, {
    DARK_APPEARANCE,
    LIGHT_APPEARANCE,
} from "@/services/stripe/client";
import { Elements } from "@stripe/react-stripe-js";
import { useTheme } from "next-themes";
import {
    estimatedCoverageTotalCentsForHourly,
    totalCoveredHoursFromMatchSchedule,
} from "../pricing/staff-request-pricing";
import type { ConfirmAndChargeProgress } from "@/trigger/staff-requests/confirm-and-charge";
import type { CoverageDataCache } from "../server/staff-request";
import { confirmStaffRequestAction } from "../server/actions";
import { CoverageSchedule } from "./coverage-schedule";

const MAX_SAVED_PAYMENT_METHODS = 3;

function formatMoney(cents: number, currency: string) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
    }).format(cents / 100);
}

function brandLabel(brand: string): string {
    const map: Record<string, string> = {
        visa: "Visa",
        mastercard: "Mastercard",
        amex: "Amex",
        discover: "Discover",
        unionpay: "UnionPay",
        jcb: "JCB",
        diners: "Diners",
        unknown: "Card",
    };
    return map[brand.toLowerCase()] ?? brand;
}

export type CoverageConfirmPanelProps = {
    requestId: string;
    cache: CoverageDataCache;
    /** Saved cards for this client (from Stripe). */
    initialPaymentMethods: PaymentMethodCardType[];
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
    initialPaymentMethods,
    cachedAtIso,
}: CoverageConfirmPanelProps) {
    const t = useTranslations("staffRequest.wizard");
    const tBilling = useTranslations("dashboard.client.billing");
    const { resolvedTheme } = useTheme();
    const stripePromise = useMemo(() => getStripeBrowser(), []);
    const appearance =
        resolvedTheme === "dark" ? DARK_APPEARANCE : LIGHT_APPEARANCE;
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [backPending, startBackTransition] = useTransition();
    const [chargeRun, setChargeRun] = useState<ChargeRunState>({ kind: "idle" });
    const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentPickerAddMode, setPaymentPickerAddMode] = useState(false);
    const [pickerAddLoading, setPickerAddLoading] = useState(false);
    const [pickerAddSecret, setPickerAddSecret] = useState<string | null>(null);
    const [settingPaymentId, setSettingPaymentId] = useState<string | null>(
        null,
    );
    const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
    const [addDialogLoading, setAddDialogLoading] = useState(false);
    const [addDialogSecret, setAddDialogSecret] = useState<string | null>(null);

    useEffect(() => {
        setPaymentMethods(initialPaymentMethods);
    }, [initialPaymentMethods]);

    useEffect(() => {
        if (!addPaymentDialogOpen) {
            setAddDialogSecret(null);
            return;
        }

        let cancelled = false;
        async function loadIntent() {
            setAddDialogLoading(true);
            setAddDialogSecret(null);
            try {
                const { error, data } = await createSetupIntent();
                if (cancelled) return;
                if (error) {
                    toast.error(error);
                    setAddPaymentDialogOpen(false);
                    return;
                }
                setAddDialogSecret(data?.clientSecret ?? null);
            } catch (e) {
                if (!cancelled) {
                    toast.error(
                        e instanceof Error
                            ? e.message
                            : tBilling("couldNotLoadForm"),
                    );
                    setAddPaymentDialogOpen(false);
                }
            } finally {
                if (!cancelled) setAddDialogLoading(false);
            }
        }
        void loadIntent();
        return () => {
            cancelled = true;
        };
    }, [addPaymentDialogOpen]);

    useEffect(() => {
        if (!paymentDialogOpen || !paymentPickerAddMode) {
            if (!paymentPickerAddMode) setPickerAddSecret(null);
            return;
        }

        let cancelled = false;
        async function loadPickerIntent() {
            setPickerAddLoading(true);
            setPickerAddSecret(null);
            try {
                const { error, data } = await createSetupIntent();
                if (cancelled) return;
                if (error) {
                    toast.error(error);
                    setPaymentPickerAddMode(false);
                    return;
                }
                setPickerAddSecret(data?.clientSecret ?? null);
            } catch (e) {
                if (!cancelled) {
                    toast.error(
                        e instanceof Error
                            ? e.message
                            : tBilling("couldNotLoadForm"),
                    );
                    setPaymentPickerAddMode(false);
                }
            } finally {
                if (!cancelled) setPickerAddLoading(false);
            }
        }
        void loadPickerIntent();
        return () => {
            cancelled = true;
        };
    }, [paymentDialogOpen, paymentPickerAddMode]);

    const hasChargeableDefault = paymentMethods.some((m) => m.isDefault);
    const displayPaymentMethod =
        paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0];

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

    async function handleSelectPaymentMethod(id: string) {
        const target = paymentMethods.find((m) => m.id === id);
        if (!target || target.isDefault) {
            setPaymentDialogOpen(false);
            return;
        }
        setSettingPaymentId(id);
        try {
            const result = await setDefaultPayment(id);
            if (result.error) throw new Error(result.error);
            setPaymentMethods((prev) =>
                prev.map((m) => ({ ...m, isDefault: m.id === id })),
            );
            toast.success(tBilling("defaultUpdated"));
            setPaymentDialogOpen(false);
        } catch {
            toast.error(tBilling("setDefaultFailed"));
        } finally {
            setSettingPaymentId(null);
        }
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

            {cachedAtIso ? (
                <p className="text-muted-foreground text-xs">
                    {t("cachedAt", {
                        relative: relativeMinutes(cachedAtIso, t),
                    })}
                </p>
            ) : null}

            {canConfirm && paymentMethods.length === 0 ? (
                <>
                    <button
                        type="button"
                        disabled={navLocked}
                        onClick={() => setAddPaymentDialogOpen(true)}
                        className={cn(
                            "w-full rounded-2xl border-2 border-dashed border-border bg-card p-4 text-left shadow-sm transition-colors",
                            "hover:border-primary/45 hover:bg-muted/25",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            navLocked && "pointer-events-none opacity-60",
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <CreditCard className="size-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-foreground text-sm font-semibold leading-snug">
                                    {t("setupPaymentMethodCardTitle")}
                                </p>
                                <p className="text-muted-foreground text-sm leading-snug">
                                    {t("setupPaymentMethodCardDescription")}
                                </p>
                            </div>
                            <ChevronRight
                                className="text-muted-foreground size-5 shrink-0"
                                aria-hidden
                            />
                        </div>
                    </button>

                    <Dialog
                        open={addPaymentDialogOpen}
                        onOpenChange={setAddPaymentDialogOpen}
                    >
                        <DialogContent className="max-w-lg sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {tBilling("addCardDialogTitle")}
                                </DialogTitle>
                                <DialogDescription>
                                    {tBilling("addCardDialogDescription")}
                                </DialogDescription>
                            </DialogHeader>
                            {addDialogLoading ? (
                                <div className="flex justify-center py-8">
                                    <CircleDashedIcon className="text-muted-foreground size-8 animate-spin" />
                                </div>
                            ) : addDialogSecret ? (
                                <Elements
                                    key={`coverage-add-${resolvedTheme ?? "light"}-${addDialogSecret}`}
                                    stripe={stripePromise}
                                    options={{
                                        appearance,
                                        clientSecret: addDialogSecret,
                                        currency: "cad",
                                        loader: "auto",
                                    }}
                                >
                                    <AddPaymentMethodForm
                                        setAsDefault
                                        onSuccess={() => {
                                            setAddPaymentDialogOpen(false);
                                            router.refresh();
                                        }}
                                        submitLabel={tBilling("addPaymentMethod")}
                                    />
                                </Elements>
                            ) : (
                                <p className="text-destructive text-sm">
                                    {tBilling("couldNotLoadForm")}
                                </p>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}

            {canConfirm && paymentMethods.length > 0 && displayPaymentMethod ? (
                <>
                    <button
                        type="button"
                        disabled={navLocked}
                        onClick={() => {
                            setPaymentPickerAddMode(false);
                            setPaymentDialogOpen(true);
                        }}
                        className={cn(
                            "w-full rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm transition-colors",
                            "hover:border-primary/35 hover:bg-muted/25",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            navLocked && "pointer-events-none opacity-60",
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <CreditCard className="size-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-foreground text-sm font-semibold">
                                    {t("paymentMethodOnFileTitle")}
                                </p>
                                <p className="text-muted-foreground truncate text-sm tabular-nums">
                                    {brandLabel(displayPaymentMethod.brand)} ····{" "}
                                    {displayPaymentMethod.last4}
                                    <span className="mx-1.5 text-border">·</span>
                                    {String(displayPaymentMethod.expMonth).padStart(2, "0")}
                                    /
                                    {String(displayPaymentMethod.expYear).slice(-2)}
                                </p>
                                {!hasChargeableDefault ? (
                                    <p className="text-amber-700 dark:text-amber-500 text-xs leading-snug">
                                        {t("paymentMethodPickDefaultHint")}
                                    </p>
                                ) : null}
                            </div>
                            <ChevronRight
                                className="text-muted-foreground size-5 shrink-0"
                                aria-hidden
                            />
                        </div>
                    </button>

                    <Dialog
                        open={paymentDialogOpen}
                        onOpenChange={(open) => {
                            setPaymentDialogOpen(open);
                            if (!open) {
                                setPaymentPickerAddMode(false);
                                setPickerAddSecret(null);
                            }
                        }}
                    >
                        <DialogContent className="flex max-h-[min(90vh,44rem)] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                            {paymentPickerAddMode ? (
                                <>
                                    <div className="border-b border-border px-6 pt-6 pb-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground -ml-2 mb-2 h-8 gap-1.5 px-2"
                                            onClick={() => {
                                                setPaymentPickerAddMode(false);
                                                setPickerAddSecret(null);
                                            }}
                                        >
                                            <ArrowLeft className="size-4" aria-hidden />
                                            {t("paymentMethodPickerBackToList")}
                                        </Button>
                                        <DialogHeader className="space-y-2 text-left">
                                            <DialogTitle>
                                                {tBilling("addCardDialogTitle")}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {tBilling(
                                                    "addCardDialogDescription",
                                                )}
                                            </DialogDescription>
                                        </DialogHeader>
                                    </div>
                                    <div className="overflow-y-auto px-6 py-4">
                                        {pickerAddLoading ? (
                                            <div className="flex justify-center py-10">
                                                <CircleDashedIcon className="text-muted-foreground size-8 animate-spin" />
                                            </div>
                                        ) : pickerAddSecret ? (
                                            <Elements
                                                key={`coverage-picker-add-${resolvedTheme ?? "light"}-${pickerAddSecret}`}
                                                stripe={stripePromise}
                                                options={{
                                                    appearance,
                                                    clientSecret: pickerAddSecret,
                                                    currency: "cad",
                                                    loader: "auto",
                                                }}
                                            >
                                                <AddPaymentMethodForm
                                                    setAsDefault={false}
                                                    onSuccess={() => {
                                                        setPaymentPickerAddMode(
                                                            false,
                                                        );
                                                        setPickerAddSecret(null);
                                                        router.refresh();
                                                    }}
                                                    submitLabel={tBilling(
                                                        "addPaymentMethod",
                                                    )}
                                                />
                                            </Elements>
                                        ) : (
                                            <p className="text-destructive text-sm">
                                                {tBilling("couldNotLoadForm")}
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="px-6 pt-6 pb-2">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {t("choosePaymentMethodTitle")}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {t(
                                                    "choosePaymentMethodDescription",
                                                )}
                                            </DialogDescription>
                                        </DialogHeader>
                                    </div>
                                    <div className="flex max-h-[min(60vh,28rem)] flex-col gap-3 overflow-y-auto px-6 pb-6">
                                        <div className="flex flex-col gap-2">
                                            {paymentMethods.map((pm) => {
                                                const exp = `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)}`;
                                                const busy =
                                                    settingPaymentId === pm.id;
                                                return (
                                                    <button
                                                        key={pm.id}
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void handleSelectPaymentMethod(
                                                                pm.id,
                                                            )
                                                        }
                                                        className={cn(
                                                            "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors",
                                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                            pm.isDefault
                                                                ? "border-primary/50 bg-primary/5"
                                                                : "border-border bg-card hover:border-primary/35 hover:bg-muted/30",
                                                            busy &&
                                                                "pointer-events-none opacity-60",
                                                        )}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            <CreditCard
                                                                className="text-primary size-4 shrink-0"
                                                                aria-hidden
                                                            />
                                                            <span className="truncate font-medium">
                                                                {brandLabel(
                                                                    pm.brand,
                                                                )}{" "}
                                                                ···· {pm.last4}
                                                            </span>
                                                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                                                {exp}
                                                            </span>
                                                        </span>
                                                        {pm.isDefault ? (
                                                            <CheckCircle2
                                                                className="text-primary size-5 shrink-0"
                                                                aria-label={tBilling(
                                                                    "defaultCardBadge",
                                                                )}
                                                            />
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {paymentMethods.length <
                                        MAX_SAVED_PAYMENT_METHODS ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full shrink-0 gap-2"
                                                onClick={() =>
                                                    setPaymentPickerAddMode(
                                                        true,
                                                    )
                                                }
                                            >
                                                <Plus
                                                    className="size-4"
                                                    aria-hidden
                                                />
                                                {tBilling("addPaymentMethod")}
                                            </Button>
                                        ) : null}
                                    </div>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
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
                        !hasChargeableDefault
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
