"use client";

import { useEffect, useMemo, useRef } from "react";
import {
    AlertCircle,
    CheckCircle2,
    CircleDashed,
    Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    TriggerAuthContext,
    useRealtimeRun,
} from "@trigger.dev/react-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type {
    matchCoverageTask,
    MatchCoverageProgress,
} from "@/trigger/staff-requests";
import { AnyTask } from "@trigger.dev/core/v3";

const STEP_ORDER: MatchCoverageProgress["step"][] = [
    "queued",
    "locating",
    "ring",
    "workers",
    "availability",
    "filter",
    "scheduling",
    "done",
];

function stepIndex(step: MatchCoverageProgress["step"] | undefined): number {
    if (!step) return -1;
    return STEP_ORDER.indexOf(step);
}

export type CoverageMatchTrackerProps = {
    runId: string;
    publicAccessToken: string;
};

/**
 * Subscribes to the `staff-requests.match-coverage` run, renders one row per
 * pipeline step, and refreshes the server route once the run completes so the
 * page can re-render with the freshly cached `coverage_data`.
 */
export function CoverageMatchTracker(props: CoverageMatchTrackerProps) {
    return (
        <TriggerAuthContext.Provider
            value={{ accessToken: props.publicAccessToken }}
        >
            <Inner runId={props.runId} />
        </TriggerAuthContext.Provider>
    );
}

function Inner({ runId }: { runId: string }) {
    const t = useTranslations("staffRequest.wizard");
    const router = useRouter();
    const refreshedRef = useRef(false);
    const { run, error } = useRealtimeRun<AnyTask>(runId);

    const progress = run?.metadata?.progress as MatchCoverageProgress | undefined;
    const currentIdx = stepIndex(progress?.step);
    const failed =
        run?.status === "FAILED" ||
        run?.status === "CRASHED" ||
        run?.status === "CANCELED";
    const completed = run?.status === "COMPLETED";

    useEffect(() => {
        if (completed && !refreshedRef.current) {
            refreshedRef.current = true;
            router.refresh();
        }
    }, [completed, router]);

    const items = useMemo(
        () =>
            STEP_ORDER.filter(
                (step) => step !== "queued" && step !== "done",
            ).map((step) => ({
                step,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label: (t as any)(`matchStep.${step}`),
            })),
        [t],
    );

    return (
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6">
            <header className="flex items-start gap-3">
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
                    <Loader2
                        className="mt-0.5 size-5 animate-spin text-primary"
                        aria-hidden
                    />
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-foreground text-base font-semibold">
                        {progress?.label ?? t("matchStarting")}
                    </p>
                    {progress?.detail ? (
                        <p className="text-muted-foreground text-sm">
                            {progress.detail}
                        </p>
                    ) : null}
                    {error ? (
                        <p className="text-destructive text-sm">
                            {error.message}
                        </p>
                    ) : null}
                </div>
            </header>

            <ol className="flex flex-col gap-2" aria-live="polite">
                {items.map((item, idx) => {
                    const isDone = currentIdx > idx + 1 || completed;
                    const isCurrent =
                        !completed && currentIdx === idx + 1;
                    return (
                        <li
                            key={item.step}
                            className={cn(
                                "flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm transition-colors",
                                isCurrent && "border-primary/50 bg-primary/5",
                                isDone && "border-emerald-500/30 bg-emerald-500/5",
                            )}
                        >
                            {isDone ? (
                                <CheckCircle2
                                    className="size-4 text-emerald-500"
                                    aria-hidden
                                />
                            ) : isCurrent ? (
                                <Loader2
                                    className="size-4 animate-spin text-primary"
                                    aria-hidden
                                />
                            ) : (
                                <CircleDashed
                                    className="text-muted-foreground size-4"
                                    aria-hidden
                                />
                            )}
                            <span
                                className={cn(
                                    "min-w-0 flex-1",
                                    !isDone &&
                                        !isCurrent &&
                                        "text-muted-foreground",
                                )}
                            >
                                {item.label}
                            </span>
                        </li>
                    );
                })}
            </ol>

            {!completed && !failed ? (
                <div
                    className="space-y-2 border-t border-border/60 pt-4"
                    aria-busy="true"
                >
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        {t("matchPreparing")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <Skeleton className="h-16 rounded-xl" />
                        <Skeleton className="h-16 rounded-xl" />
                        <Skeleton className="h-16 rounded-xl" />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
