"use client";

import { type Resolver, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { enCA, frCA } from "date-fns/locale";
import { ArrowRight, CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { cn } from "@/lib/utils";

import {
    buildStaffRequestScheduleSchema,
    type StaffRequestScheduleValues,
} from "../schema";
import { reconcileDailyWindowsToRange } from "../lib/daily-windows-sync";
import { coerceStaffRequestWindowsForTodayLead } from "../lib/coerce-staff-request-windows-lead";
import { StaffRequestDailyTimeRows } from "./staff-request-daily-time-rows";

export type ScheduleRequestFormValues = StaffRequestScheduleValues;

const defaults: StaffRequestScheduleValues = {
    startDate: undefined as unknown as Date,
    endDate: null,
    positions: 1,
    dailyWindows: [],
};

export type ScheduleRequestFormProps = {
    /**
     * Submit handler.
     * - Returning a Promise that throws keeps the button in a loading state and the
     *   form mounted so the user can retry without re-entering data.
     */
    onSubmit: (values: ScheduleRequestFormValues) => Promise<void> | void;
    /** Optional CTA label override (defaults to `staffRequest.wizard.submitSchedule`). */
    submitLabel?: string;
    /** Pre-fill the form when the user is bouncing between steps. */
    initialValues?: Partial<StaffRequestScheduleValues>;
};

/**
 * Step-1 schedule form for the staff request wizard.
 *
 * Reused on `/find-staff` (landing) and `/client/requests/new`. Rendering is
 * intentionally self-contained so callers only have to wire up `onSubmit`.
 */
export function ScheduleRequestForm({
    onSubmit,
    submitLabel,
    initialValues,
}: ScheduleRequestFormProps) {
    const t = useTranslations("staffRequest.wizard");
    const tVal = useTranslations("staffRequest.validation");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const dateLocale = locale.toLowerCase().startsWith("fr") ? frCA : enCA;

    const scheduleSchema = useMemo(
        () => buildStaffRequestScheduleSchema(tVal).staffRequestScheduleSchema,
        [tVal],
    );

    const form = useForm<StaffRequestScheduleValues>({
        resolver: zodResolver(
            scheduleSchema,
        ) as Resolver<StaffRequestScheduleValues>,
        defaultValues: { ...defaults, ...initialValues },
    });

    const {
        getValues,
        setValue,
        register,
        formState: { errors, isSubmitting },
        control,
        handleSubmit,
    } = form;

    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    const startDateVal = useWatch({ control, name: "startDate" });
    const endDateVal = useWatch({ control, name: "endDate" });
    const dailyWindowsVal = useWatch({ control, name: "dailyWindows" });

    useEffect(() => {
        if (!startDateVal || Number.isNaN(startDateVal.getTime())) {
            const cur = getValues("dailyWindows");
            if (cur.length > 0) {
                setValue("dailyWindows", [], { shouldValidate: true });
            }
            return;
        }
        const prev = getValues("dailyWindows") ?? [];
        const next = reconcileDailyWindowsToRange(prev, startDateVal, endDateVal);
        const coerced = coerceStaffRequestWindowsForTodayLead(next);
        if (JSON.stringify(prev) !== JSON.stringify(coerced)) {
            setValue("dailyWindows", coerced, { shouldValidate: true });
        }
    }, [startDateVal, endDateVal, getValues, setValue]);

    function handleDailyWindowsChange(next: StaffRequestScheduleValues["dailyWindows"]) {
        const coerced = coerceStaffRequestWindowsForTodayLead(next);
        setValue("dailyWindows", coerced, { shouldValidate: true });
        if (coerced.length === 0) return;
        const sorted = [...coerced].sort((a, b) => a.date.localeCompare(b.date));
        const minStr = sorted[0]!.date;
        const maxStr = sorted[sorted.length - 1]!.date;
        setValue("startDate", parseISO(`${minStr}T12:00:00`), {
            shouldValidate: true,
        });
        if (minStr === maxStr) {
            setValue("endDate", null, { shouldValidate: true });
        } else {
            setValue("endDate", parseISO(`${maxStr}T12:00:00`), {
                shouldValidate: true,
            });
        }
    }

    const submitText = submitLabel ?? t("submitSchedule");

    return (
        <form
            className="space-y-6"
            onSubmit={handleSubmit(async (values) => {
                await onSubmit(values);
            })}
        >
            <FieldGroup>
                <Field data-invalid={!!errors.positions}>
                    <FieldLabel htmlFor="schedule-positions">{t("staffCount")}</FieldLabel>
                    <FieldDescription>{t("staffCountDescription")}</FieldDescription>
                    <Input
                        id="schedule-positions"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        {...register("positions", { valueAsNumber: true })}
                    />
                    <FieldError>{errors.positions?.message}</FieldError>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.startDate}>
                        <FieldLabel>{t("startDate")}</FieldLabel>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !startDateVal && "text-muted-foreground",
                                    )}
                                >
                                    <CalendarIcon className="mr-2 size-4" />
                                    {startDateVal
                                        ? format(startDateVal, "PPP", { locale: dateLocale })
                                        : tCommon("pickADate")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDateVal}
                                    onSelect={(d) => {
                                        if (d) {
                                            setValue("startDate", d, { shouldValidate: true });
                                            setStartDateOpen(false);
                                        }
                                    }}
                                    disabled={(d) =>
                                        d < new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                        <FieldError>{errors.startDate?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.endDate}>
                        <FieldLabel>{t("endDate")}</FieldLabel>
                        <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !endDateVal && "text-muted-foreground",
                                    )}
                                >
                                    <CalendarIcon className="mr-2 size-4" />
                                    {endDateVal
                                        ? format(endDateVal, "PPP", { locale: dateLocale })
                                        : t("sameDay")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDateVal ?? undefined}
                                    onSelect={(d) => {
                                        setValue("endDate", d ?? null, {
                                            shouldValidate: true,
                                        });
                                        setEndDateOpen(false);
                                    }}
                                    disabled={(d) => {
                                        if (!startDateVal) return true;
                                        return d < startDateVal;
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        <FieldError>{errors.endDate?.message}</FieldError>
                    </Field>
                </div>

                {startDateVal && !Number.isNaN(startDateVal.getTime()) ? (
                    <div
                        className="space-y-2"
                        data-invalid={!!errors.dailyWindows}
                    >
                        <StaffRequestDailyTimeRows
                            windows={dailyWindowsVal ?? []}
                            disabled={isSubmitting}
                            onChange={handleDailyWindowsChange}
                        />
                        <FieldError>{errors.dailyWindows?.message}</FieldError>
                    </div>
                ) : null}
            </FieldGroup>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                <LoadingSwap isLoading={isSubmitting}>
                    <span className="inline-flex items-center gap-2">
                        {submitText}
                        <ArrowRight className="size-4" />
                    </span>
                </LoadingSwap>
            </Button>
        </form>
    );
}
