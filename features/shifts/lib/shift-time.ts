import { formatInTimeZone } from "date-fns-tz";

import { SHIFT_SCHEDULE_TIMEZONE } from "../constants";

export type ShiftWallClockWindow = {
    /** YYYY-MM-DD in {@link SHIFT_SCHEDULE_TIMEZONE} */
    dateYmd: string;
    /** HH:mm wall-clock start */
    startHHmm: string;
    /** HH:mm wall-clock end */
    endHHmm: string;
};

/**
 * Converts the UTC `start_time` / `end_time` columns into the eastern
 * wall-clock window the matcher and pricing math operate on.
 *
 * Returns `null` for missing or invalid timestamps so callers can short-circuit
 * cleanly.
 */
export function shiftWindowFromTimestamps(
    startTime: string | null,
    endTime: string | null,
): ShiftWallClockWindow | null {
    if (!startTime || !endTime) return null;
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    return {
        dateYmd: formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, "yyyy-MM-dd"),
        startHHmm: formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, "HH:mm"),
        endHHmm: formatInTimeZone(e, SHIFT_SCHEDULE_TIMEZONE, "HH:mm"),
    };
}

export type DailyWindowMatch = {
    date: string;
    slots: { startTime: string; endTime: string }[];
};

/** Parse the raw `staff_requests.daily_time_windows` jsonb into typed windows. */
export function parseDailyWindows(raw: unknown): DailyWindowMatch[] {
    if (!raw || !Array.isArray(raw)) return [];
    return raw as DailyWindowMatch[];
}
