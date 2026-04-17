"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Copy, Globe, Plus, Trash2, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import {
  COMMON_TIMEZONES,
  DAY_LABELS,
  DAY_ORDER,
} from "@/features/availability/lib/constants";

/** Localized day labels for the 0..6 day-of-week range (0 = Sunday). */
function useDayLabels() {
  const tDays = useTranslations("kyc.onboarding.forms.availability.days");
  return useMemo(
    () =>
      ({
        0: tDays("0"),
        1: tDays("1"),
        2: tDays("2"),
        3: tDays("3"),
        4: tDays("4"),
        5: tDays("5"),
        6: tDays("6"),
      }) as typeof DAY_LABELS,
    [tDays],
  );
}
import {
  defaultWeekSchedule,
  nextContinuationSlot,
  type WeekAvailabilityState,
} from "@/features/availability/lib/week-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeQuarterHourRow } from "@/components/time-range-quarter-hour-row";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CopyTimesPopoverProps = {
  sourceD: number;
  sourceEnabled: boolean;
  sourceSlotsLength: number;
  onApply: (targetDays: number[]) => void;
};

function CopyTimesPopover({
  sourceD,
  sourceEnabled,
  sourceSlotsLength,
  onApply,
}: CopyTimesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Set<number>>(() => new Set());
  const t = useTranslations("kyc.onboarding.forms.availability");
  const dayLabels = useDayLabels();

  const selectable = useMemo(
    () => DAY_ORDER.filter((d) => d !== sourceD),
    [sourceD],
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setTargets(new Set());
  }

  const allSelected =
    selectable.length > 0 && selectable.every((d) => targets.has(d));

  function toggleSelectAll() {
    setTargets(() =>
      allSelected ? new Set() : new Set(selectable),
    );
  }

  function toggleDay(d: number) {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function apply() {
    onApply(Array.from(targets));
    setOpen(false);
  }

  const canOpen = sourceEnabled && sourceSlotsLength > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              disabled={!canOpen}
              aria-label={t("copyTimesAria")}
            >
              <Copy className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("copyTimesTooltip")}</TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-border border-b px-4 py-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t("copyTimesTo")}
          </p>
        </div>
        <div className="max-h-[min(60vh,320px)] overflow-y-auto px-2 py-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => toggleSelectAll()}
            />
            <span className="text-sm font-medium">{t("selectAll")}</span>
          </label>
          <div className="border-border my-1 border-t" />
          {selectable.map((dow) => (
            <label
              key={dow}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60"
            >
              <Checkbox
                checked={targets.has(dow)}
                onCheckedChange={() => toggleDay(dow)}
              />
              <span className="text-sm">{dayLabels[dow]}</span>
            </label>
          ))}
        </div>
        <div className="border-border flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" size="sm" className="rounded-full px-5" onClick={apply}>
            {t("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type WorkerAvailabilityScheduleFieldsProps = {
  initial: WorkerAvailabilityInitial;
  /** Called whenever the form's serialized payload diverges from `initial`. */
  onDirtyChange?: (isDirty: boolean) => void;
};

/**
 * Body-only renderer: the hidden payload input + timezone + days cards.
 * Must live inside a `<form>` supplied by the caller so `useFormStatus`
 * and the submit button work correctly.
 */
export function WorkerAvailabilityScheduleFields({
  initial,
  onDirtyChange,
}: WorkerAvailabilityScheduleFieldsProps) {
  const [week, setWeek] = useState<WeekAvailabilityState>(
    () => initial.week ?? defaultWeekSchedule(),
  );
  const [timezone, setTimezone] = useState(initial.timezone);
  const [autoConfirm, setAutoConfirm] = useState<boolean>(
    initial.autoConfirm ?? false,
  );
  const t = useTranslations("kyc.onboarding.forms.availability");
  const dayLabels = useDayLabels();

  const timezoneOptions = useMemo((): string[] => {
    const list: string[] = [...COMMON_TIMEZONES];
    if (timezone && !list.includes(timezone)) {
      list.unshift(timezone);
    }
    return list;
  }, [timezone]);

  const initialPayload = useMemo(() => {
    const seeded = initial.week ?? defaultWeekSchedule();
    return JSON.stringify({
      timezone: initial.timezone,
      week: Object.fromEntries(DAY_ORDER.map((d) => [String(d), seeded[d]!])),
      autoConfirm: initial.autoConfirm ?? false,
    });
  }, [initial]);

  const payload = useMemo(
    () =>
      JSON.stringify({
        timezone,
        week: Object.fromEntries(DAY_ORDER.map((d) => [String(d), week[d]!])),
        autoConfirm,
      }),
    [timezone, week, autoConfirm],
  );

  const isDirty = payload !== initialPayload;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function setDayEnabled(d: number, enabled: boolean) {
    setWeek((w) => ({
      ...w,
      [d]: {
        enabled,
        slots:
          w[d]!.slots.length > 0
            ? w[d]!.slots
            : [{ start: "09:00", end: "17:00" }],
      },
    }));
  }

  function addSlot(d: number) {
    setWeek((w) => {
      const day = w[d]!;
      const last = day.slots[day.slots.length - 1]!;
      const appended = nextContinuationSlot(last.end);
      return {
        ...w,
        [d]: {
          ...day,
          enabled: true,
          slots: [...day.slots, appended],
        },
      };
    });
  }

  function removeSlot(d: number, idx: number) {
    setWeek((w) => {
      const day = w[d]!;
      if (day.slots.length <= 1) return w;
      return {
        ...w,
        [d]: {
          ...day,
          slots: day.slots.filter((_, i) => i !== idx),
        },
      };
    });
  }

  return (
    <>
      <input type="hidden" name="payload" value={payload} />
      <div className="mt-6 mb-4 grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 h-full">
          <CardContent className="space-y-2">
            <Label
              htmlFor="tz"
              className="flex items-center gap-2"
            >
              <Globe className="text-muted-foreground size-4" />
              {t("timezoneLabel")}
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="tz" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="border-border/80 h-full">
          <CardContent className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="auto-confirm"
                className="flex items-center gap-2"
              >
                <Zap className="text-muted-foreground size-4" />
                {t("autoConfirmLabel")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {t("autoConfirmDescription")}
              </p>
            </div>
            <Switch
              id="auto-confirm"
              checked={autoConfirm}
              onCheckedChange={setAutoConfirm}
              aria-label={t("autoConfirmAria")}
              className="shrink-0"
            />
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/80">
        <CardContent>
          <div className="space-y-4">
            {DAY_ORDER.map((d) => {
              const day = week[d]!;
              return (
                <div
                  key={d}
                  className="flex flex-col gap-3 sm:flex-row sm:items-start"
                >
                  <div className="flex w-full min-w-[140px] items-center gap-3 sm:w-[180px]">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(v) => setDayEnabled(d, v)}
                      aria-label={t("dayAvailableAria", { day: dayLabels[d] })}
                    />
                    <Label className="text-sm font-medium">{dayLabels[d]}</Label>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {day.enabled
                      ? day.slots.map((slot, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <TimeRangeQuarterHourRow
                              start={slot.start}
                              end={slot.end}
                              onChange={({ start, end }) => {
                                setWeek((w) => {
                                  const day = w[d]!;
                                  const slots = day.slots.map((s, i) =>
                                    i === idx ? { start, end } : s,
                                  );
                                  return { ...w, [d]: { ...day, slots } };
                                });
                              }}
                              startAriaLabel={t("dayStartAria", { day: dayLabels[d] })}
                              endAriaLabel={t("dayEndAria", { day: dayLabels[d] })}
                            />
                            <div className="flex items-center gap-3 ml-3">
                              {idx === 0 ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 shrink-0"
                                        onClick={() => addSlot(d)}
                                        aria-label={t("addHoursAria")}
                                      >
                                        <Plus className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t("addSlotTooltip")}
                                    </TooltipContent>
                                  </Tooltip>
                                  <CopyTimesPopover
                                    sourceD={d}
                                    sourceEnabled={day.enabled}
                                    sourceSlotsLength={day.slots.length}
                                    onApply={(targetDays) => {
                                      setWeek((w) => {
                                        const source = w[d]!;
                                        const slots = source.slots.map((s) => ({
                                          ...s,
                                        }));
                                        const next = { ...w };
                                        for (const td of targetDays) {
                                          if (td === d) continue;
                                          next[td] = {
                                            enabled: true,
                                            slots: slots.map((s) => ({ ...s })),
                                          };
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </>
                              ) : null}
                              {day.slots.length > 1 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeSlot(d, idx)}
                                      aria-label={t("removeSlotAria")}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t("removeSlotTooltip")}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </div>
                        ))
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export type WorkerAvailabilityScheduleFormProps = {
  initial: WorkerAvailabilityInitial;
  formAction: NonNullable<ComponentProps<"form">["action"]>;
  header?: ReactNode;
  footer?: ReactNode;
  onDirtyChange?: (isDirty: boolean) => void;
};

/**
 * Convenience wrapper for callers that want the classic single-unit form
 * (onboarding, etc.). New streaming flows should compose their own `<form>`
 * with {@link WorkerAvailabilityScheduleFields}.
 */
export function WorkerAvailabilityScheduleForm({
  initial,
  formAction,
  header,
  footer,
  onDirtyChange,
}: WorkerAvailabilityScheduleFormProps) {
  return (
    <form action={formAction} className="space-y-8">
      {header}
      <WorkerAvailabilityScheduleFields
        initial={initial}
        onDirtyChange={onDirtyChange}
      />
      {footer ?? null}
    </form>
  );
}

export function WorkerAvailabilityScheduleFieldsSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 mt-6 mb-4">
        <Card className="border-border/80 h-full">
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="border-border/80 h-full">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/80">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <div className="ml-auto flex items-center gap-2">
                  <Skeleton className="h-9 w-24 rounded-md" />
                  <Skeleton className="h-4 w-3" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
