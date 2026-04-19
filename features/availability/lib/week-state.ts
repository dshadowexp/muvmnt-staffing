import { hhmmToMinutes, minutesToHhmm } from "@/lib/quarter-hour-times";
import { DAY_ORDER, DEFAULT_SLOT } from "./constants";

export type TimeSlot = { start: string; end: string };

export type DayAvailabilityState = {
  enabled: boolean;
  slots: TimeSlot[];
};

export type WeekAvailabilityState = Record<number, DayAvailabilityState>;

export function defaultWeekSchedule(): WeekAvailabilityState {
  const row = (enabled: boolean): DayAvailabilityState => ({
    enabled,
    slots: [{ ...DEFAULT_SLOT }],
  });
  return {
    0: row(false),
    1: row(true),
    2: row(true),
    3: row(true),
    4: row(true),
    5: row(true),
    6: row(false),
  };
}

export function normalizeDbTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return DEFAULT_SLOT.start;
  const h = String(parseInt(m[1]!, 10)).padStart(2, "0");
  const min = m[2]!;
  return `${h}:${min}`;
}

/** Build week state from `availability` rows (0 = Sunday). */
export function weekStateFromRows(
  rows: { day_of_week: number; start_time: string; end_time: string }[],
): WeekAvailabilityState {
  const byDay = new Map<number, TimeSlot[]>();
  for (const d of DAY_ORDER) {
    byDay.set(d, []);
  }
  for (const r of rows) {
    const list = byDay.get(r.day_of_week) ?? [];
    list.push({
      start: normalizeDbTime(r.start_time),
      end: normalizeDbTime(r.end_time),
    });
    byDay.set(r.day_of_week, list);
  }
  const out: WeekAvailabilityState = { ...defaultWeekSchedule() };
  for (const d of DAY_ORDER) {
    const slots = byDay.get(d) ?? [];
    if (slots.length > 0) {
      out[d] = { enabled: true, slots };
    } else {
      out[d] = { enabled: false, slots: [{ ...DEFAULT_SLOT }] };
    }
  }
  return out;
}

export function toDbTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "09:00:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

const DAY_END_MIN = 24 * 60 - 1; // 23:59

/** Parse `HH:mm` to minutes from midnight. */
export function timeHmToMinutes(t: string): number {
  const normalized = normalizeDbTime(t);
  const [h, m] = normalized.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.min(Math.max(h * 60 + m, 0), DAY_END_MIN);
}

export function minutesToTimeHm(total: number): string {
  const clamped = Math.max(0, Math.min(Math.round(total), DAY_END_MIN));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Next interval after `lastEndTime`: starts at that end (15-minute grid), ends one hour later when possible.
 */
export function nextContinuationSlot(lastEndTime: string): TimeSlot {
  const raw = normalizeDbTime(lastEndTime);
  let startM = hhmmToMinutes(raw);
  startM = Math.floor(startM / 15) * 15;
  if (startM > 23 * 60 + 30) {
    return { start: "23:15", end: "23:45" };
  }
  let endM = Math.min(startM + 60, 23 * 60 + 45);
  endM = Math.round(endM / 15) * 15;
  if (endM <= startM) {
    endM = Math.min(startM + 15, 23 * 60 + 45);
  }
  return {
    start: minutesToHhmm(startM),
    end: minutesToHhmm(endM),
  };
}
