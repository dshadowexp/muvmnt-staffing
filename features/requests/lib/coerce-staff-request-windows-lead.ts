import { isToday, parseISO } from "date-fns";
import {
  DEFAULT_SAME_DAY_LEAD_HOURS,
  hhmmToMinutes,
  nextQuarterHourAfter,
  quarterHourEndOptionsAfter,
  quarterHourStartOptions,
} from "@/lib/quarter-hour-times";

export type DayWindowLike = {
  date: string;
  slots: { startTime: string; endTime: string }[];
};

/** Snap starts on **today** to the first allowed quarter-hour (now + lead); fix ends. */
export function coerceStaffRequestWindowsForTodayLead<T extends DayWindowLike>(
  windows: T[],
  leadHours: number = DEFAULT_SAME_DAY_LEAD_HOURS,
): T[] {
  return windows.map((day) => {
    const anchor = parseISO(`${day.date}T12:00:00`);
    if (!isToday(anchor)) return day;

    const opts = quarterHourStartOptions(anchor, leadHours);
    if (opts.length === 0) return day;

    const allowed = new Set(opts);
    const slots = day.slots.map((slot) => {
      let { startTime, endTime } = slot;

      if (!allowed.has(startTime)) {
        startTime =
          opts.find((o) => hhmmToMinutes(o) >= hhmmToMinutes(startTime)) ??
          opts[opts.length - 1]!;
      }

      if (hhmmToMinutes(endTime) <= hhmmToMinutes(startTime)) {
        endTime = nextQuarterHourAfter(startTime);
      }
      const endAllowed = quarterHourEndOptionsAfter(startTime);
      if (!endAllowed.includes(endTime)) {
        endTime = endAllowed[0] ?? nextQuarterHourAfter(startTime);
      }

      return { ...slot, startTime, endTime };
    });

    return { ...day, slots };
  });
}
