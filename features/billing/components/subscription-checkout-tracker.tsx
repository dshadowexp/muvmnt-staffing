"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    AlertCircle,
    CheckCircle2,
    CircleDashedIcon,
} from "lucide-react";
import {
    TriggerAuthContext,
    useRealtimeRun,
} from "@trigger.dev/react-hooks";
import { toast } from "sonner";
import { AnyTask } from "@trigger.dev/core/v3";

import { getSubscriptionCheckoutWatchState } from "@/features/billing/actions/subscription-checkout-watch";

const POLL_MS = 2000;
const POLL_MAX_ATTEMPTS = 45;

/**
 * When returning from Stripe Checkout with `?subscription=success`, shows provisioning
 * progress using Trigger.dev Realtime when a matching run exists (same pattern as coverage),
 * otherwise polls until the `subscriptions` row is active.
 */
export function SubscriptionCheckoutTracker() {
    const searchParams = useSearchParams();
    const subscriptionSuccess = searchParams.get("subscription") === "success";

    if (!subscriptionSuccess) return null;

    return <SubscriptionCheckoutTrackerInner />;
}

function SubscriptionCheckoutTrackerInner() {
    const t = useTranslations("dashboard.client.subscriptionCheckout");
    const [watch, setWatch] = useState<
        Awaited<ReturnType<typeof getSubscriptionCheckoutWatchState>> | null
    >(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const state = await getSubscriptionCheckoutWatchState();
            if (!cancelled) setWatch(state);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (watch?.phase === "unauthenticated") return null;

    if (!watch) {
        return (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                    <CircleDashedIcon className="size-5 animate-spin text-primary" aria-hidden />
                    <p className="text-muted-foreground text-sm">{t("loading")}</p>
                </div>
            </div>
        );
    }

    if (watch.phase === "complete") {
        return <FinalizeCheckoutSuccess />;
    }

    if (watch.phase === "track") {
        return (
            <TriggerAuthContext.Provider
                value={{ accessToken: watch.publicAccessToken }}
            >
                <RealtimeSubscriptionRun runId={watch.runId} />
            </TriggerAuthContext.Provider>
        );
    }

    return <PollSubscriptionActivation />;
}

/** DB already has an active subscription row (e.g. webhook finished before first paint). */
function FinalizeCheckoutSuccess() {
    const t = useTranslations("dashboard.client.subscriptionCheckout");
    const router = useRouter();
    const pathname = usePathname();
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        toast.success(t("activatedToast"));
        router.replace(pathname);
        router.refresh();
    }, [pathname, router, t]);

    return null;
}

function RealtimeSubscriptionRun({ runId }: { runId: string }) {
    const t = useTranslations("dashboard.client.subscriptionCheckout");
    const router = useRouter();
    const pathname = usePathname();
    const refreshedRef = useRef(false);
    const toastShownRef = useRef(false);

    const { run, error } = useRealtimeRun<AnyTask>(runId);

    const failed =
        run?.status === "FAILED" ||
        run?.status === "CRASHED" ||
        run?.status === "CANCELED";
    const completed = run?.status === "COMPLETED";

    useEffect(() => {
        if (completed && !refreshedRef.current) {
            refreshedRef.current = true;
            if (!toastShownRef.current) {
                toastShownRef.current = true;
                toast.success(t("activatedToast"));
            }
            router.replace(pathname);
            router.refresh();
        }
    }, [completed, pathname, router, t]);

    useEffect(() => {
        if (failed && !toastShownRef.current) {
            toastShownRef.current = true;
            toast.error(t("activationFailedToast"));
        }
    }, [failed, t]);

    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
                {failed ? (
                    <AlertCircle
                        className="mt-0.5 size-5 text-destructive"
                        aria-hidden
                    />
                ) : completed ? (
                    <CheckCircle2
                        className="mt-0.5 size-5 text-emerald-500"
                        aria-hidden
                    />
                ) : (
                    <CircleDashedIcon
                        className="mt-0.5 size-5 animate-spin text-primary"
                        aria-hidden
                    />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                        {failed
                            ? t("activationFailedTitle")
                            : completed
                              ? t("activatedTitle")
                              : t("activatingTitle")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {failed ? t("activationFailedHint") : t("activatingHint")}
                    </p>
                    {error ? (
                        <p className="text-destructive text-xs">{error.message}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function PollSubscriptionActivation() {
    const t = useTranslations("dashboard.client.subscriptionCheckout");
    const router = useRouter();
    const pathname = usePathname();
    const attemptsRef = useRef(0);
    const doneRef = useRef(false);

    useEffect(() => {
        const id = window.setInterval(async () => {
            if (doneRef.current) return;
            attemptsRef.current += 1;
            if (attemptsRef.current > POLL_MAX_ATTEMPTS) {
                window.clearInterval(id);
                toast.error(t("activationTimeoutToast"));
                doneRef.current = true;
                return;
            }

            const state = await getSubscriptionCheckoutWatchState();
            if (state.phase === "complete") {
                window.clearInterval(id);
                doneRef.current = true;
                toast.success(t("activatedToast"));
                router.replace(pathname);
                router.refresh();
            }
        }, POLL_MS);

        return () => window.clearInterval(id);
    }, [pathname, router, t]);

    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <CircleDashedIcon
                    className="mt-0.5 size-5 animate-spin text-primary"
                    aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                        {t("activatingTitle")}
                    </p>
                    <p className="text-muted-foreground text-xs">{t("pollHint")}</p>
                </div>
            </div>
        </div>
    );
}
