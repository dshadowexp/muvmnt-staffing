import { eachDayOfInterval, format } from "date-fns";

/** Inclusive local calendar days as `yyyy-MM-dd`. */
export function calendarDayStrings(start: Date, end: Date | null | undefined): string[] {
  if (Number.isNaN(start.getTime())) return [];
  const last = end ?? start;
  if (Number.isNaN(last.getTime())) return [];
  if (last < start) return [format(start, "yyyy-MM-dd")];
  return eachDayOfInterval({ start, end: last }).map((d) => format(d, "yyyy-MM-dd"));
}
