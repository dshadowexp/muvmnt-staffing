import { addHours, isToday, set } from "date-fns";
import { DEFAULT_SAME_DAY_LEAD_HOURS } from "@/lib/quarter-hour-times";

/** Minimum lead time when the shift start date is the current local calendar day. */
const SAME_DAY_MIN_LEAD_HOURS = DEFAULT_SAME_DAY_LEAD_HOURS;

export function staffRequestSameDayLeadHours(): number {
  return SAME_DAY_MIN_LEAD_HOURS;
}

/** Earliest allowed start instant (now + lead hours), in local time. */
export function staffRequestDeadlineAfterNow(): Date {
  return addHours(new Date(), SAME_DAY_MIN_LEAD_HOURS);
}

export function minutesFromHHmm(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Negative if `a` is earlier than `b` (same-day wall-clock). */
export function compareHHmm(a: string, b: string): number {
  return minutesFromHHmm(a) - minutesFromHHmm(b);
}

/**
 * When `startDate` is today, start at `startTime` must be no earlier than
 * now + {@link staffRequestSameDayLeadHours}.
 */
export function isStartDateTimeAtLeastLeadHoursFromNow(
  startDate: Date,
  startTimeHHmm: string,
): boolean {
  if (!isToday(startDate)) return true;
  const [h, m] = startTimeHHmm.split(":").map(Number);
  const startDt = set(startDate, {
    hours: h,
    minutes: m,
    seconds: 0,
    milliseconds: 0,
  });
  return startDt.getTime() >= staffRequestDeadlineAfterNow().getTime();
}
