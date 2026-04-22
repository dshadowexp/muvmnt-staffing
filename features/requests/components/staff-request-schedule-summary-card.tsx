"use client";

import { Briefcase, CalendarRange, Clock, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { enCA, frCA } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime12h } from "@/features/availability/lib/summarize-week";
import { normalizeProfessionId } from "@/lib/professions";
import { COMPLIANCE_IDS_SET } from "@/lib/compliance";
import { STAFF_REQUEST_SKILL_IDS_SET } from "@/lib/skills";
import { staffRequestExtraRequirements } from "@/features/requests/constants";

function skillSummaryLabel(
    id: string,
    tSkills: (key: string) => string,
): string {
    return STAFF_REQUEST_SKILL_IDS_SET.has(id) ? tSkills(id) : id;
}

function complianceSummaryLabel(
    id: string,
    tCompliance: (key: string) => string,
): string {
    return COMPLIANCE_IDS_SET.has(id) ? tCompliance(id) : id;
}

export type StaffRequestScheduleSummaryCardProps = {
    positions: number;
    startDate: string;
    endDate: string | null;
    dailyWindows: {
        date: string;
        slots: { startTime: string; endTime: string }[];
    }[];
    profession: string;
    tasks?: string[];
    requirements?: string[];
};

function formatSlotLine(startTime: string, endTime: string): string {
    return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}

function hoursBetween(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return 0;
    const start = sh + sm / 60;
    const end = eh + em / 60;
    return Math.max(0, end - start);
}

/**
 * Read-only schedule summary for wizard steps (e.g. pricing): card wrapping a
 * collapsible accordion. Trigger shows title + staff/date range; body lists shifts.
 */
export function StaffRequestScheduleSummaryCard({
    positions,
    startDate,
    endDate,
    dailyWindows,
    profession,
    tasks = [],
    requirements = [],
}: StaffRequestScheduleSummaryCardProps) {
    const t = useTranslations("staffRequest.wizard");
    const tProf = useTranslations("professions");
    const tSkills = useTranslations("skills");
    const tCompliance = useTranslations("compliance");
    const locale = useLocale();
    const dateLocale = locale.toLowerCase().startsWith("fr") ? frCA : enCA;

    const professionId = normalizeProfessionId(profession);
    const professionLabel = tProf(professionId);
    const skillsList = [...tasks].filter(Boolean).sort((a, b) => a.localeCompare(b));
    const extraCompliance = staffRequestExtraRequirements(requirements).sort((a, b) =>
        a.localeCompare(b),
    );
    const showSkills = skillsList.length > 0;
    const showExtraCompliance = extraCompliance.length > 0;

    const startYmd = startDate.slice(0, 10);
    const endYmd = (endDate ?? startDate).slice(0, 10);
    const rangeLabel =
        startYmd === endYmd
            ? format(parseISO(startYmd), "PPP", { locale: dateLocale })
            : `${format(parseISO(startYmd), "PP", { locale: dateLocale })} – ${format(
                  parseISO(endYmd),
                  "PP",
                  { locale: dateLocale },
              )}`;

    const sortedDays = [...dailyWindows].sort((a, b) => a.date.localeCompare(b.date));

    const totalHours =
        Math.max(1, positions) *
        sortedDays.reduce(
            (sum, day) =>
                sum +
                day.slots.reduce(
                    (s, slot) => s + hoursBetween(slot.startTime, slot.endTime),
                    0,
                ),
            0,
        );

    const dayLines = sortedDays.map((day) => {
        const dayLabel = format(parseISO(day.date.slice(0, 10)), "EEE, MMM d, yyyy", {
            locale: dateLocale,
        });
        const slotsText =
            day.slots.length > 0
                ? day.slots.map((s) => formatSlotLine(s.startTime, s.endTime)).join(", ")
                : null;
        return { key: day.date, dayLabel, slotsText };
    });

    return (
        <Card className="border-border/80 overflow-hidden py-0">
            <CardContent className="p-0">
                <Accordion
                    type="single"
                    collapsible
                    className="rounded-none border-0 shadow-none"
                >
                    <AccordionItem value="summary" className="border-0">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                                <span className="font-semibold text-foreground">
                                    {t("requestSummaryTitle")}
                                </span>
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Briefcase
                                            className="size-3.5 shrink-0"
                                            aria-hidden
                                        />
                                        {professionLabel}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Users className="size-3.5 shrink-0" aria-hidden />
                                        {t("requestSummaryStaff", { count: positions })}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarRange
                                            className="size-3.5 shrink-0"
                                            aria-hidden
                                        />
                                        {rangeLabel}
                                    </span>
                                    {totalHours > 0 ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Clock
                                                className="size-3.5 shrink-0"
                                                aria-hidden
                                            />
                                            {t("requestSummaryHours", {
                                                hours: totalHours,
                                            })}
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                            <div className="space-y-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                                {showSkills ? (
                                    <p>
                                        <span className="text-foreground font-medium">
                                            {t("skillsLabel")}
                                            {": "}
                                        </span>
                                        {skillsList
                                            .map((id) =>
                                                skillSummaryLabel(id, tSkills),
                                            )
                                            .join(", ")}
                                    </p>
                                ) : null}
                                {showExtraCompliance ? (
                                    <p>
                                        <span className="text-foreground font-medium">
                                            {t("requirementsLabel")}
                                            {": "}
                                        </span>
                                        {extraCompliance
                                            .map((id) =>
                                                complianceSummaryLabel(
                                                    id,
                                                    tCompliance,
                                                ),
                                            )
                                            .join(", ")}
                                    </p>
                                ) : null}
                                <div className="space-y-0.5">
                                    {dayLines.length > 0 ? (
                                        dayLines.map((day) => (
                                            <p key={day.key}>
                                                <span className="text-foreground">
                                                    {day.dayLabel}
                                                </span>
                                                {day.slotsText ? (
                                                    <>
                                                        <span className="text-muted-foreground">
                                                            ,{" "}
                                                        </span>
                                                        {day.slotsText}
                                                    </>
                                                ) : null}
                                            </p>
                                        ))
                                    ) : (
                                        <p>{t("requestSummaryNoSchedule")}</p>
                                    )}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
