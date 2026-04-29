import { addDays, parseISO } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";

function hhmmToMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

function addOneCalendarDayYmd(dateYmd: string): string {
  const anchor = parseISO(`${dateYmd}T12:00:00.000Z`);
  return formatInTimeZone(addDays(anchor, 1), "UTC", "yyyy-MM-dd");
}

/** Same rules as `insertShiftsFromCoverage` — eastern wall clock → UTC ISO range. */
export function wallClockShiftToUtcRange(
  dateYmd: string,
  startHhmm: string,
  endHhmm: string,
): { startIso: string; endIso: string } {
  const startM = hhmmToMinutes(startHhmm);
  const endM = hhmmToMinutes(endHhmm);
  const endYmd = endM < startM ? addOneCalendarDayYmd(dateYmd) : dateYmd;

  const pad = (n: number) => String(n).padStart(2, "0");
  const toIso = (ymd: string, hhmm: string): string => {
    const [h, mi] = [
      Number(hhmm.split(":")[0] ?? 0),
      Number(hhmm.split(":")[1] ?? 0),
    ];
    return toDate(`${ymd}T${pad(h)}:${pad(mi)}:00`, {
      timeZone: SHIFT_SCHEDULE_TIMEZONE,
    }).toISOString();
  };

  return { startIso: toIso(dateYmd, startHhmm), endIso: toIso(endYmd, endHhmm) };
}
