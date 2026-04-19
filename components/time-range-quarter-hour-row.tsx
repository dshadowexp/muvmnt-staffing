"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DEFAULT_SAME_DAY_LEAD_HOURS,
  hhmmToMinutes,
  nextQuarterHourAfter,
  quarterHourEndOptionsAfter,
  quarterHourStartOptions,
} from "@/lib/quarter-hour-times";

type QuarterHourSelectProps = {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
};

function QuarterHourSelect({
  value,
  options,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  className,
}: QuarterHourSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  /** Never inject `value` into the list when it is not a valid option (e.g. 9:00 AM excluded for “today”). */
  const displayOptions = useMemo(
    () => [...options].sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b)),
    [options],
  );

  const listSelected = displayOptions.includes(value);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(t);
  }, [open, value, listSelected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || displayOptions.length === 0}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "h-9 w-[130px] shrink-0 justify-between rounded-lg border border-input bg-input/30 px-3 py-1 font-normal shadow-none hover:bg-input/50",
            className,
          )}
        >
          <span className="tabular-nums">{formatTime(value)}</span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="min-w-[10.5rem] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          role="listbox"
          className="max-h-[min(280px,45vh)] overflow-y-auto p-1 pb-3"
        >
          {displayOptions.map((opt) => {
            const selected = listSelected && opt === value;
            return (
              <button
                key={opt}
                ref={selected ? selectedRef : undefined}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-muted/80 focus-visible:bg-muted/80 focus-visible:outline-none",
                  selected && "bg-muted",
                )}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <span className="tabular-nums">{formatTime(opt)}</span>
                {selected ? (
                  <Check className="text-foreground size-4 shrink-0" aria-hidden />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type TimeRangeQuarterHourRowProps = {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
  /**
   * When set and this date is **today** (local), start options begin at
   * `now + leadHoursWhenToday` (rounded up to the next 15-minute mark).
   */
  calendarDay?: Date;
  /** Same-day lead in hours; defaults to {@link DEFAULT_SAME_DAY_LEAD_HOURS}. */
  leadHoursWhenToday?: number;
  disabled?: boolean;
  startAriaLabel?: string;
  endAriaLabel?: string;
  className?: string;
};

/**
 * Start + end pickers on a 15-minute grid. If start ≥ end, end snaps to the next
 * quarter-hour after start. Used by availability and staff-request day rows.
 */
export function TimeRangeQuarterHourRow({
  start,
  end,
  onChange,
  calendarDay,
  leadHoursWhenToday = DEFAULT_SAME_DAY_LEAD_HOURS,
  disabled,
  startAriaLabel,
  endAriaLabel,
  className,
}: TimeRangeQuarterHourRowProps) {
  const startOptions = useMemo(
    () => quarterHourStartOptions(calendarDay, leadHoursWhenToday),
    [calendarDay, leadHoursWhenToday],
  );

  const endOptions = useMemo(() => quarterHourEndOptionsAfter(start), [start]);

  /** If props are out of sync (e.g. 9:00 stored for “today” while options exclude it), fix before paint. */
  useLayoutEffect(() => {
    if (disabled || startOptions.length === 0) return;
    if (startOptions.includes(start)) return;
    const nextStart =
      startOptions.find((o) => hhmmToMinutes(o) >= hhmmToMinutes(start)) ??
      startOptions[startOptions.length - 1]!;
    let e = end;
    if (hhmmToMinutes(e) <= hhmmToMinutes(nextStart)) {
      e = nextQuarterHourAfter(nextStart);
    }
    const endAllowed = quarterHourEndOptionsAfter(nextStart);
    if (!endAllowed.includes(e)) {
      e = endAllowed[0] ?? nextQuarterHourAfter(nextStart);
    }
    onChange({ start: nextStart, end: e });
  }, [start, end, startOptions, disabled, onChange]);

  function emit(nextStart: string, nextEnd: string) {
    let e = nextEnd;
    if (hhmmToMinutes(e) <= hhmmToMinutes(nextStart)) {
      e = nextQuarterHourAfter(nextStart);
    }
    const endAllowed = quarterHourEndOptionsAfter(nextStart);
    if (!endAllowed.includes(e)) {
      e = endAllowed[0] ?? nextQuarterHourAfter(nextStart);
    }
    onChange({ start: nextStart, end: e });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <QuarterHourSelect
        value={start}
        options={startOptions}
        disabled={disabled}
        aria-label={startAriaLabel}
        onChange={(nextStart) => emit(nextStart, end)}
      />
      <span className="text-muted-foreground">–</span>
      <QuarterHourSelect
        value={end}
        options={endOptions}
        disabled={disabled}
        aria-label={endAriaLabel}
        onChange={(nextEnd) => {
          if (hhmmToMinutes(nextEnd) <= hhmmToMinutes(start)) {
            emit(start, nextQuarterHourAfter(start));
          } else {
            onChange({ start, end: nextEnd });
          }
        }}
      />
    </div>
  );
}
