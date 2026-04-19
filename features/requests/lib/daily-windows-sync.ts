import type { StaffRequestDayWindow } from "../schema";

const DEFAULT_SLOT = { startTime: "09:00" as const, endTime: "17:00" as const };

/** Build / merge per-day plans when the date range changes; preserves slots for dates that still exist. */
export function reconcileDailyWindows(
  previous: StaffRequestDayWindow[],
  dayStrings: string[],
): StaffRequestDayWindow[] {
  const prevByDate = new Map(previous.map((w) => [w.date, w]));
  return dayStrings.map((date) => {
    const p = prevByDate.get(date);
    if (p) {
      return {
        date,
        slots: p.slots.map((s) => ({ ...s })),
      };
    }
    return { date, slots: [{ ...DEFAULT_SLOT }] };
  });
}
