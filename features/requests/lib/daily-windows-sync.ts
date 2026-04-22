import type { StaffRequestDayWindow } from "../schema";
import { calendarDayStrings } from "./calendar-day-strings";

const DEFAULT_SLOT = { startTime: "09:00" as const, endTime: "17:00" as const };

/**
 * When start/end changes: clip rows outside the new range; add default slots only
 * for dates newly covered on the left or right edge. Dates omitted in the middle
 * of a range stay omitted (gaps).
 */
export function reconcileDailyWindowsToRange(
    previous: StaffRequestDayWindow[],
    start: Date,
    end: Date | null | undefined,
): StaffRequestDayWindow[] {
    if (Number.isNaN(start.getTime())) return [];

    const fullRange = calendarDayStrings(start, end);
    if (fullRange.length === 0) return [];

    const s = fullRange[0]!;
    const e = fullRange[fullRange.length - 1]!;

    const inRange = previous.filter((w) => w.date >= s && w.date <= e);

    if (inRange.length === 0) {
        return fullRange.map((date) => {
            const p = previous.find((w) => w.date === date);
            if (p) {
                return { date, slots: p.slots.map((sl) => ({ ...sl })) };
            }
            return { date, slots: [{ ...DEFAULT_SLOT }] };
        });
    }

    const sorted = [...inRange].sort((a, b) => a.date.localeCompare(b.date));
    const minRem = sorted[0]!.date;
    const maxRem = sorted[sorted.length - 1]!.date;

    const leftNew = fullRange.filter((d) => d < minRem);
    const rightNew = fullRange.filter((d) => d > maxRem);

    return [
        ...leftNew.map((date) => ({ date, slots: [{ ...DEFAULT_SLOT }] })),
        ...sorted.map((w) => ({
            date: w.date,
            slots: w.slots.map((sl) => ({ ...sl })),
        })),
        ...rightNew.map((date) => ({ date, slots: [{ ...DEFAULT_SLOT }] })),
    ];
}
