import "server-only";

import { addDays, parseISO } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { createAdminClient } from "@/services/supabase/server";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import type { DaySchedule } from "./matching";

/** Stored as `shifts.hourly_rate`; remainder is platform margin. */
const SHIFT_HOURLY_RATE_SHARE_OF_REQUEST = 0.75;

export type ShiftLocationPayload = {
    address: string;
    lat: number;
    lng: number;
};

function hhmmToMinutes(hhmm: string): number {
    const [h = "0", m = "0"] = hhmm.split(":");
    return Number(h) * 60 + Number(m);
}

function addOneCalendarDayYmd(dateYmd: string): string {
    const anchor = parseISO(`${dateYmd}T12:00:00.000Z`);
    return formatInTimeZone(addDays(anchor, 1), "UTC", "yyyy-MM-dd");
}

/**
 * Eastern wall-clock → UTC ISO range. If end is earlier than start (overnight),
 * end is taken as the **next** calendar day.
 */
function easternWallClockShiftToUtcRange(
    dateYmd: string,
    startHhmm: string,
    endHhmm: string,
): { startIso: string; endIso: string } {
    const startM = hhmmToMinutes(startHhmm);
    const endM = hhmmToMinutes(endHhmm);
    const endYmd = endM < startM ? addOneCalendarDayYmd(dateYmd) : dateYmd;

    const pad = (n: number) => String(n).padStart(2, "0");
    const toIso = (ymd: string, hhmm: string): string => {
        const [h, mi] = [Number(hhmm.split(":")[0] ?? 0), Number(hhmm.split(":")[1] ?? 0)];
        const localNoTz = `${ymd}T${pad(h)}:${pad(mi)}:00`;
        return toDate(localNoTz, { timeZone: SHIFT_SCHEDULE_TIMEZONE }).toISOString();
    };

    return {
        startIso: toIso(dateYmd, startHhmm),
        endIso: toIso(endYmd, endHhmm),
    };
}

export type InsertShiftsResult =
    | { ok: true; inserted: number }
    | { ok: false; message: string };

/**
 * Materialize one `shifts` row per assignment segment in `schedule`.
 * - `clientUserId` is `users.id` (NOT `clients.id`); we resolve `clients.id` here.
 * - `userId` on each assignment is `users.id`; we resolve `workers.id` here too.
 */
export async function insertShiftsFromCoverage(params: {
    staffRequestId: string;
    clientUserId: string;
    hourlyRate: number;
    schedule: DaySchedule[];
    location: ShiftLocationPayload | null;
}): Promise<InsertShiftsResult> {
    const supabase = await createAdminClient();

    const userIds = [
        ...new Set(params.schedule.flatMap((d) => d.assignments.map((a) => a.userId))),
    ];
    if (userIds.length === 0) return { ok: true, inserted: 0 };

    const [clientRes, workerRes] = await Promise.all([
        supabase
            .from("clients")
            .select("id")
            .eq("user_id", params.clientUserId)
            .single(),
        supabase
            .from("workers")
            .select("id, user_id")
            .in("user_id", userIds),
    ]);

    if (clientRes.error || !clientRes.data) {
        return {
            ok: false,
            message: clientRes.error?.message ?? "Could not resolve client id for shifts",
        };
    }
    if (workerRes.error || !workerRes.data?.length) {
        return {
            ok: false,
            message: workerRes.error?.message ?? "Could not resolve workers for shifts",
        };
    }

    const userToWorker = new Map(workerRes.data.map((w) => [w.user_id, w.id]));
    const clientId = clientRes.data.id;

    const shiftHourlyRate =
        Number.isFinite(params.hourlyRate) && params.hourlyRate > 0
            ? Math.round(params.hourlyRate * SHIFT_HOURLY_RATE_SHARE_OF_REQUEST * 100) / 100
            : params.hourlyRate;

    const rows: {
        request_id: string;
        client_id: string;
        worker_id: string;
        start_time: string;
        end_time: string;
        hourly_rate: number;
        status: string | null;
        location: ShiftLocationPayload | null;
    }[] = [];

    for (const day of params.schedule) {
        for (const a of day.assignments) {
            const wid = userToWorker.get(a.userId);
            if (!wid) continue;
            const { startIso, endIso } = easternWallClockShiftToUtcRange(
                day.date,
                a.startTime,
                a.endTime,
            );
            rows.push({
                request_id: params.staffRequestId,
                client_id: clientId,
                worker_id: wid,
                start_time: startIso,
                end_time: endIso,
                hourly_rate: shiftHourlyRate,
                status: "scheduled",
                location: params.location,
            });
        }
    }

    if (rows.length === 0) return { ok: true, inserted: 0 };

    const { error } = await supabase.from("shifts").insert(rows);
    if (error) return { ok: false, message: error.message };
    return { ok: true, inserted: rows.length };
}
