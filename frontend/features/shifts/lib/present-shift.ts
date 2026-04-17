import { formatCurrency, formatTime } from "@/lib/formatters";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { format, isValid, parseISO } from "date-fns";
import { SHIFT_SCHEDULE_TIMEZONE } from "./shift-schedule-timezone";

/**
 * Supabase/Postgres `timestamptz` is often serialized as `yyyy-MM-dd HH:mm:ss+00`
 * (space between date and time). `date-fns` `parseISO` expects `T` in that position.
 */
function normalizeDbTimestampToIso(value: string): string {
  const t = value.trim();
  if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(t)) {
    return t.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  }
  return t;
}

/** Parse a shift boundary from DB: full timestamptz / ISO, or legacy `HH:mm` only. */
function parseShiftInstant(value: string): Date | null {
  const normalized = normalizeDbTimestampToIso(value);
  const d = parseISO(normalized);
  if (isValid(d)) return d;
  return null;
}

function isLikelyWallClockTimeOnly(value: string): boolean {
  const t = value.trim();
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(t) && !/^\d{4}-\d{2}-\d{2}/.test(t);
}

function formatShiftInstantInZone(date: Date, pattern: string): string {
  return formatInTimeZone(date, SHIFT_SCHEDULE_TIMEZONE, pattern);
}

/** Calendar label from staff request `start_date` when shift times are wall-clock only. */
function scheduleDatePartFromFallback(fallbackDate: string | null | undefined): string | null {
  if (fallbackDate == null || fallbackDate === "") return null;
  const raw = normalizeDbTimestampToIso(fallbackDate).trim();
  const d =
    raw.length <= 10
      ? toDate(`${raw}T12:00:00`, { timeZone: SHIFT_SCHEDULE_TIMEZONE })
      : parseISO(raw);
  return isValid(d) ? formatInTimeZone(d, SHIFT_SCHEDULE_TIMEZONE, "MMM d, yyyy") : null;
}

/** Expected shift start: date and time in the shift schedule timezone (Eastern). */
export function formatExpectedShiftStart(
  start: string | null,
  fallbackDate?: string | null,
): string {
  if (start == null || start === "") return "—";
  const s = parseShiftInstant(start);
  if (s) return formatShiftInstantInZone(s, "MMM d, yyyy · h:mm a");
  if (isLikelyWallClockTimeOnly(start)) {
    const datePart = scheduleDatePartFromFallback(fallbackDate);
    const startT = formatTime(start);
    return datePart ? `${datePart} · ${startT}` : startT;
  }
  return start;
}

/** Expected shift end: date and time in the shift schedule timezone (Eastern). */
export function formatExpectedShiftEnd(
  end: string | null,
  fallbackDate?: string | null,
): string {
  if (end == null || end === "") return "—";
  const e = parseShiftInstant(end);
  if (e) return formatShiftInstantInZone(e, "MMM d, yyyy · h:mm a");
  if (isLikelyWallClockTimeOnly(end)) {
    const datePart = scheduleDatePartFromFallback(fallbackDate);
    const endT = formatTime(end);
    return datePart ? `${datePart} · ${endT}` : endT;
  }
  return end;
}

export function formatShiftRange(
  start: string | null,
  end: string | null,
  fallbackDate?: string | null,
): string {
  if (start == null || start === "") return "—";

  const s = parseShiftInstant(start);
  if (s) {
    if (end != null && end !== "") {
      const e = parseShiftInstant(end);
      if (e) {
        return `${formatShiftInstantInZone(s, "MMM d, yyyy")} · ${formatShiftInstantInZone(s, "h:mm a")} – ${formatShiftInstantInZone(e, "h:mm a")}`;
      }
    }
    return formatShiftInstantInZone(s, "MMM d, yyyy · h:mm a");
  }

  if (isLikelyWallClockTimeOnly(start)) {
    const datePart = scheduleDatePartFromFallback(fallbackDate);
    const startT = formatTime(start);
    if (end != null && end !== "") {
      const line = `${startT} – ${formatTime(end)}`;
      return datePart ? `${datePart} · ${line}` : line;
    }
    return datePart ? `${datePart} · ${startT}` : startT;
  }

  return start;
}

export function shiftHoursBetween(
  start: string | null,
  end: string | null,
): number | null {
  if (start == null || end == null || start === "" || end === "") return null;
  const a = parseShiftInstant(start);
  const b = parseShiftInstant(end);
  if (a == null || b == null) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms / (1000 * 60 * 60);
}

/** Calendar date only (worker shifts table “Date” column). */
export function formatShiftWorkerTableDate(
  start: string | null,
  fallbackDate?: string | null,
): string {
  if (start == null || start === "") return "—";
  const s = parseShiftInstant(start);
  if (s) return formatShiftInstantInZone(s, "MMM d, yyyy");

  if (isLikelyWallClockTimeOnly(start)) {
    return scheduleDatePartFromFallback(fallbackDate) ?? "—";
  }
  return "—";
}

/** Time range plus length, e.g. `9:00 AM – 5:00 PM (8.0h)` (worker shifts table “Duration”). */
export function formatShiftWorkerTableDuration(
  start: string | null,
  end: string | null,
): string {
  const hours = shiftHoursBetween(start, end);

  if (start == null || start === "") return "—";

  const s = parseShiftInstant(start);
  if (s) {
    if (end != null && end !== "") {
      const e = parseShiftInstant(end);
      if (e) {
        return `${formatShiftInstantInZone(s, "h:mm a")} – ${formatShiftInstantInZone(e, "h:mm a")}`;
      }
    }
    return `${formatShiftInstantInZone(s, "h:mm a")}`;
  }

  if (isLikelyWallClockTimeOnly(start)) {
    const startT = formatTime(start);
    if (end != null && end !== "") {
      return `${startT} – ${formatTime(end)}`;
    }
    return `${startT}`;
  }

  return "—";
}

export function effectiveHourlyRate(
  shiftRate: number | null | undefined,
  requestRate: number | null | undefined,
): number | null {
  if (shiftRate != null && shiftRate > 0) return shiftRate;
  if (requestRate != null && requestRate > 0) return requestRate;
  return null;
}

export function formatShiftPay(
  hours: number | null,
  rate: number | null,
): { hoursLabel: string; payLabel: string } {
  const hoursLabel =
    hours != null && hours > 0 ? `${hours.toFixed(1)}h` : "—";
  const payLabel =
    hours != null && hours > 0 && rate != null && rate > 0
      ? formatCurrency(hours * rate)
      : "—";
  return { hoursLabel, payLabel };
}
