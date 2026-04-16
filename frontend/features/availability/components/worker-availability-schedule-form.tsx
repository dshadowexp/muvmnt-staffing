"use client";

import {
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import type { WorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import {
  COMMON_TIMEZONES,
  DAY_LABELS,
  DAY_ORDER,
} from "@/features/availability/lib/constants";
import {
  defaultWeekSchedule,
  nextContinuationSlot,
  type WeekAvailabilityState,
} from "@/features/availability/lib/week-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          disabled={!canOpen}
          aria-label="Copy times to other days"
        >
          <Copy className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-border border-b px-4 py-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Copy times to
          </p>
        </div>
        <div className="max-h-[min(60vh,320px)] overflow-y-auto px-2 py-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => toggleSelectAll()}
            />
            <span className="text-sm font-medium">Select all</span>
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
              <span className="text-sm">{DAY_LABELS[dow]}</span>
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
            Cancel
          </Button>
          <Button type="button" size="sm" className="rounded-full px-5" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type WorkerAvailabilityScheduleFormProps = {
  initial: WorkerAvailabilityInitial;
  formAction: NonNullable<ComponentProps<"form">["action"]>;
  header?: ReactNode;
  footer?: ReactNode;
};

export function WorkerAvailabilityScheduleForm({
  initial,
  formAction,
  header,
  footer,
}: WorkerAvailabilityScheduleFormProps) {
  const [week, setWeek] = useState<WeekAvailabilityState>(
    () => initial.week ?? defaultWeekSchedule(),
  );
  const [timezone, setTimezone] = useState(initial.timezone);

  const timezoneOptions = useMemo((): string[] => {
    const list: string[] = [...COMMON_TIMEZONES];
    if (timezone && !list.includes(timezone)) {
      list.unshift(timezone);
    }
    return list;
  }, [timezone]);

  const payload = useMemo(
    () =>
      JSON.stringify({
        timezone,
        week: Object.fromEntries(DAY_ORDER.map((d) => [String(d), week[d]!])),
      }),
    [timezone, week],
  );

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
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="payload" value={payload} />
      {header}

      <Card className="border-border/80">
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="tz">Timezone</Label>
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
      <Card className="border-border/80">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {DAY_ORDER.map((d) => {
              const day = week[d]!;
              return (
                <div
                  key={d}
                  className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start"
                >
                  <div className="flex w-full min-w-[140px] items-center gap-3 sm:w-[180px]">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(v) => setDayEnabled(d, v)}
                      aria-label={`${DAY_LABELS[d]} available`}
                    />
                    <Label className="text-sm font-medium">{DAY_LABELS[d]}</Label>
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
                              startAriaLabel={`${DAY_LABELS[d]} start time`}
                              endAriaLabel={`${DAY_LABELS[d]} end time`}
                            />
                            <div className="ml-auto flex items-center gap-1">
                              {idx === 0 ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 shrink-0"
                                    onClick={() => addSlot(d)}
                                    aria-label="Add hours for this day"
                                  >
                                    <Plus className="size-4" />
                                  </Button>
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
                                      aria-label="Remove this time range"
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Remove this time range
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
      {footer ?? null}
    </form>
  );
}
