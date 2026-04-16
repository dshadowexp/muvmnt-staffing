import { addHours, isToday, set } from "date-fns";

export const QUARTER_STEP_MIN = 15;

/** Used for same-calendar-day “not before now + lead” (UI + staff-request validation). */
export const DEFAULT_SAME_DAY_LEAD_HOURS = 2;

/** Latest start on the quarter grid; end may be 23:45 or 23:59 (see {@link quarterHourEndOptionsAfter}). */
const LAST_START_MINUTES = 23 * 60 + 45;

/** All `HH:mm` strings on a 15-minute grid for one local day. */
export function allQuarterHourHhmm(): string[] {
  const out: string[] = [];
  for (let m = 0; m <= 23 * 60 + 45; m += QUARTER_STEP_MIN) {
    out.push(minutesToHhmm(m));
  }
  return out;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHhmm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Next grid time strictly after `hhmm` (+15m), or `23:59` after the last quarter (23:45). */
export function nextQuarterHourAfter(hhmm: string): string {
  const next = hhmmToMinutes(hhmm) + QUARTER_STEP_MIN;
  if (next <= 23 * 60 + 45) return minutesToHhmm(next);
  return "23:59";
}

/** Wall-clock instant on the given anchor date (use noon-parsed YMD to reduce TZ shift). */
export function wallClockOnCalendarDay(calendarAnchor: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return set(calendarAnchor, {
    hours: h,
    minutes: m,
    seconds: 0,
    milliseconds: 0,
  });
}

/** Start-time options: full grid, or only times ≥ now + lead when `calendarDay` is today. */
export function quarterHourStartOptions(
  calendarDay: Date | undefined,
  leadHoursWhenToday: number,
): string[] {
  const all = allQuarterHourHhmm().filter((t) => hhmmToMinutes(t) <= LAST_START_MINUTES);
  if (!calendarDay || !isToday(calendarDay)) return all;
  const earliest = addHours(new Date(), leadHoursWhenToday);
  return all.filter((t) => wallClockOnCalendarDay(calendarDay, t).getTime() >= earliest.getTime());
}

/** End-time options strictly after `startHhmm` on the same calendar day. */
export function quarterHourEndOptionsAfter(startHhmm: string): string[] {
  const startM = hhmmToMinutes(startHhmm);
  const base = allQuarterHourHhmm().filter((t) => hhmmToMinutes(t) > startM);
  if (base.length === 0 && startM === 23 * 60 + 45) {
    return ["23:59"];
  }
  return base;
}
