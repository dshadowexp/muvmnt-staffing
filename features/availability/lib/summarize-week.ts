import { DAY_ORDER } from "./constants";
import {
  defaultWeekSchedule,
  type TimeSlot,
  type WeekAvailabilityState,
} from "./week-state";

const SHORT_DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export type AvailabilityGroup = {
  /** Human label for a run of consecutive days, e.g. `Mon - Fri` or `Sat`. */
  dayLabel: string;
  slots: TimeSlot[];
};

function signatureForSlots(slots: TimeSlot[]): string {
  return slots.map((s) => `${s.start}-${s.end}`).join("|");
}

function labelFor(days: number[]): string {
  if (days.length === 1) return SHORT_DAY_LABELS[days[0]!]!;
  const first = days[0]!;
  const last = days[days.length - 1]!;
  return `${SHORT_DAY_LABELS[first]} - ${SHORT_DAY_LABELS[last]}`;
}

/**
 * Group consecutive enabled days whose slot lists are identical into a single
 * row. Disabled days are omitted. Non-consecutive matches start a new group.
 */
export function summarizeWeek(week: WeekAvailabilityState): AvailabilityGroup[] {
  const runs: { sig: string; days: number[]; slots: TimeSlot[] }[] = [];
  for (const d of DAY_ORDER) {
    const day = week[d];
    if (!day?.enabled || day.slots.length === 0) continue;
    const sig = signatureForSlots(day.slots);
    const last = runs[runs.length - 1];
    if (last && last.sig === sig && last.days[last.days.length - 1] === d - 1) {
      last.days.push(d);
    } else {
      runs.push({ sig, days: [d], slots: day.slots });
    }
  }
  return runs.map((r) => ({ dayLabel: labelFor(r.days), slots: r.slots }));
}

/** `09:00` → `9:00 AM`, `17:30` → `5:30 PM`. */
export function formatTime12h(hhmm: string): string {
  const [rawH, rawM] = hhmm.split(":");
  const h = Number(rawH);
  const m = Number(rawM);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatSlot(slot: TimeSlot): string {
  return `${formatTime12h(slot.start)} - ${formatTime12h(slot.end)}`;
}

const DEFAULT_WEEK_SIGNATURE = JSON.stringify(defaultWeekSchedule());

export function isDefaultWeek(week: WeekAvailabilityState): boolean {
  return JSON.stringify(week) === DEFAULT_WEEK_SIGNATURE;
}
