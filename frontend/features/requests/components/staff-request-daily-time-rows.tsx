"use client";

import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TimeRangeQuarterHourRow } from "@/components/time-range-quarter-hour-row";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StaffRequestDayWindow } from "../schema";
import { CopyStaffRequestDayTimesPopover } from "./copy-staff-request-day-times-popover";
import { coerceStaffRequestWindowsForTodayLead } from "../lib/coerce-staff-request-windows-lead";
import { nextStaffRequestSlotAfter } from "../lib/staff-request-slot-helpers";

type StaffRequestDailyTimeRowsProps = {
  windows: StaffRequestDayWindow[];
  onChange: (next: StaffRequestDayWindow[]) => void;
  disabled?: boolean;
};

function formatDayHeading(ymd: string) {
  return format(parseISO(`${ymd}T12:00:00`), "EEEE, MMM d, yyyy");
}

export function StaffRequestDailyTimeRows({
  windows,
  onChange,
  disabled = false,
}: StaffRequestDailyTimeRowsProps) {
  const dates = windows.map((w) => w.date);

  function emitWindows(next: StaffRequestDayWindow[]) {
    onChange(coerceStaffRequestWindowsForTodayLead(next));
  }

  function patchDay(dayIndex: number, nextDay: StaffRequestDayWindow) {
    emitWindows(windows.map((w, i) => (i === dayIndex ? nextDay : w)));
  }

  function patchSlot(dayIndex: number, slotIndex: number, patch: { startTime?: string; endTime?: string }) {
    const day = windows[dayIndex]!;
    const slots = day.slots.map((s, i) => (i === slotIndex ? { ...s, ...patch } : s));
    patchDay(dayIndex, { ...day, slots });
  }

  function addSlot(dayIndex: number) {
    const day = windows[dayIndex]!;
    const last = day.slots[day.slots.length - 1]!;
    const appended = nextStaffRequestSlotAfter(last.endTime);
    patchDay(dayIndex, { ...day, slots: [...day.slots, appended] });
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    const day = windows[dayIndex]!;
    if (day.slots.length <= 1) return;
    patchDay(dayIndex, {
      ...day,
      slots: day.slots.filter((_, i) => i !== slotIndex),
    });
  }

  function applyCopyFrom(sourceDate: string, targetDates: string[]) {
    const src = windows.find((w) => w.date === sourceDate);
    if (!src || targetDates.length === 0) return;
    const slotsCopy = src.slots.map((s) => ({ ...s }));
    const next = windows.map((w) =>
      targetDates.includes(w.date) ? { ...w, slots: slotsCopy.map((s) => ({ ...s })) } : w,
    );
    emitWindows(next);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <Label className="text-base font-medium">Times by day</Label>
      </div>
      <div className="space-y-4">
        {windows.map((w, dayIdx) => {
          const rowDate = parseISO(`${w.date}T12:00:00`);
          return (
            <div
              key={w.date}
              className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start"
            >
              <div className="w-full min-w-[160px] sm:w-[220px]">
                <p className="text-sm font-medium">{formatDayHeading(w.date)}</p>
                <p className="text-muted-foreground font-mono text-xs">{w.date}</p>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {w.slots.map((slot, slotIdx) => (
                  <div
                    key={`${w.date}-${slotIdx}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <TimeRangeQuarterHourRow
                      start={slot.startTime}
                      end={slot.endTime}
                      calendarDay={rowDate}
                      disabled={disabled}
                      onChange={({ start, end }) =>
                        patchSlot(dayIdx, slotIdx, { startTime: start, endTime: end })
                      }
                      startAriaLabel={`Start time ${w.date} slot ${slotIdx + 1}`}
                      endAriaLabel={`End time ${w.date} slot ${slotIdx + 1}`}
                    />
                    <div className="ml-auto flex items-center gap-1">
                      {slotIdx === 0 ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0"
                            disabled={disabled}
                            onClick={() => addSlot(dayIdx)}
                            aria-label={`Add time range for ${w.date}`}
                          >
                            <Plus className="size-4" />
                          </Button>
                          <CopyStaffRequestDayTimesPopover
                            sourceDate={w.date}
                            allDates={dates}
                            disabled={disabled || dates.length <= 1}
                            onApply={(targets) => applyCopyFrom(w.date, targets)}
                          />
                        </>
                      ) : null}
                      {w.slots.length > 1 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={disabled}
                              onClick={() => removeSlot(dayIdx, slotIdx)}
                              aria-label="Remove this time range"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove this time range</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
