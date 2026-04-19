"use client";

import { format, parseISO } from "date-fns";
import { enCA, frCA } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { MatchedWorkerAvatar } from "./matched-worker-avatar";
import type { CoverageDataCache } from "../server/staff-request";

const MAX_COVERAGE_AVATARS_INLINE = 3;

type Assignment = CoverageDataCache["schedule"][number]["assignments"][number];

function groupByTimeWindow(assignments: Assignment[]): Assignment[][] {
    const keys: string[] = [];
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
        const key = `${a.startTime}\0${a.endTime}`;
        if (!map.has(key)) {
            keys.push(key);
            map.set(key, []);
        }
        map.get(key)!.push(a);
    }
    return keys.map((k) => map.get(k)!);
}

export type CoverageScheduleProps = {
    schedule: CoverageDataCache["schedule"];
    fullyCovered: boolean;
    candidateCount: number;
};

/**
 * Read-only render of the matched coverage. Pure presentation — used by the
 * coverage page and the post-confirm preview.
 */
export function CoverageSchedule({
    schedule,
    fullyCovered,
    candidateCount,
}: CoverageScheduleProps) {
    const t = useTranslations("staffRequest.wizard");
    const locale = useLocale();
    const dateLocale = locale.toLowerCase().startsWith("fr") ? frCA : enCA;

    const formatDayLabel = (ymd: string) =>
        format(parseISO(`${ymd}T12:00:00`), "EEEE, MMM d, yyyy", {
            locale: dateLocale,
        });

    const hasAssigned = schedule.some((d) => d.assignments.length > 0);

    return (
        <div className="flex flex-col gap-6">
            {candidateCount === 0 ? (
                <div
                    role="status"
                    className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50"
                >
                    {t("noWorkersTier")}
                </div>
            ) : !hasAssigned ? (
                <div
                    role="status"
                    className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50"
                >
                    {t("noMatchTimes")}
                </div>
            ) : !fullyCovered ? (
                <div
                    role="status"
                    className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50"
                >
                    {t("partialCoverage")}
                </div>
            ) : null}

            {schedule.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    {t("noScheduleDays")}
                </p>
            ) : (
                <ul className="space-y-4">
                    {schedule.map((day) => (
                        <li
                            key={day.date}
                            className="rounded-2xl border border-border bg-card p-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                <p className="font-medium">
                                    {formatDayLabel(day.date)}
                                </p>
                                <span
                                    className={cn(
                                        "rounded-full px-2 py-0.5 text-xs font-medium",
                                        day.covered
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                            : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {day.covered
                                        ? t("covered")
                                        : t("notCovered")}
                                </span>
                            </div>
                            {day.assignments.length === 0 ? (
                                <p className="text-muted-foreground mt-3 text-sm">
                                    {t("noWorkerDay")}
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-3">
                                    {groupByTimeWindow(day.assignments).map(
                                        (group) => {
                                            const first = group[0]!;
                                            const windowKey = `${first.startTime}-${first.endTime}`;
                                            const windowDisplay = `${formatTime(first.startTime)} – ${formatTime(first.endTime)}`;
                                            const years = group.map((g) => g.yearsExp);
                                            const yMin = Math.min(...years);
                                            const yMax = Math.max(...years);
                                            const yearsLabel =
                                                yMin === yMax
                                                    ? t("yrsExp", { years: yMin })
                                                    : t("yrsExpRange", {
                                                          min: yMin,
                                                          max: yMax,
                                                      });
                                            const names = group
                                                .map((g) => g.displayName)
                                                .join(", ");
                                            const rowKey = `${day.date}-${windowKey}-${group.map((g) => g.userId).join("-")}`;

                                            if (group.length === 1) {
                                                const a = group[0]!;
                                                return (
                                                    <li
                                                        key={rowKey}
                                                        className="flex min-w-0 items-center gap-3"
                                                    >
                                                        <MatchedWorkerAvatar
                                                            photoUrl={a.photoUrl}
                                                            displayName={a.displayName}
                                                            className="shrink-0"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium">
                                                                {a.displayName}
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                {t("yrsExp", {
                                                                    years: a.yearsExp,
                                                                })}
                                                            </p>
                                                        </div>
                                                        <span className="text-muted-foreground shrink-0 text-right text-sm tabular-nums">
                                                            {windowDisplay}
                                                        </span>
                                                    </li>
                                                );
                                            }

                                            const visible = group.slice(
                                                0,
                                                MAX_COVERAGE_AVATARS_INLINE,
                                            );
                                            const overflow =
                                                group.length - visible.length;
                                            const overflowWorkers = group.slice(
                                                MAX_COVERAGE_AVATARS_INLINE,
                                            );
                                            return (
                                                <li
                                                    key={rowKey}
                                                    className="flex min-w-0 items-center gap-3"
                                                >
                                                    <AvatarGroup className="shrink-0">
                                                        {visible.map((a) => (
                                                            <Tooltip key={a.userId}>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex shrink-0 cursor-default">
                                                                        <MatchedWorkerAvatar
                                                                            photoUrl={a.photoUrl}
                                                                            displayName={a.displayName}
                                                                            size="sm"
                                                                        />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent
                                                                    side="top"
                                                                    className="max-w-xs"
                                                                >
                                                                    <p className="font-medium leading-tight">
                                                                        {a.displayName}
                                                                    </p>
                                                                    <p className="text-muted-foreground text-xs">
                                                                        {t("yrsExpShort", {
                                                                            years: a.yearsExp,
                                                                        })}
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ))}
                                                        {overflow > 0 ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AvatarGroupCount
                                                                        className="cursor-default"
                                                                        aria-label={t(
                                                                            "moreAssigned",
                                                                            { count: overflow },
                                                                        )}
                                                                    >
                                                                        +{overflow}
                                                                    </AvatarGroupCount>
                                                                </TooltipTrigger>
                                                                <TooltipContent
                                                                    side="top"
                                                                    className="max-w-xs"
                                                                >
                                                                    <ul className="space-y-1.5 text-sm">
                                                                        {overflowWorkers.map(
                                                                            (a) => (
                                                                                <li
                                                                                    key={a.userId}
                                                                                >
                                                                                    <span className="font-medium">
                                                                                        {a.displayName}
                                                                                    </span>
                                                                                    <span className="text-muted-foreground text-xs">
                                                                                        {" "}
                                                                                        · {t("yrsExp", {
                                                                                            years: a.yearsExp,
                                                                                        })}
                                                                                    </span>
                                                                                </li>
                                                                            ),
                                                                        )}
                                                                    </ul>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : null}
                                                    </AvatarGroup>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium">
                                                            {names}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {yearsLabel}
                                                        </p>
                                                    </div>
                                                    <span className="text-muted-foreground shrink-0 text-right text-sm tabular-nums">
                                                        {windowDisplay}
                                                    </span>
                                                </li>
                                            );
                                        },
                                    )}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
