import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import { wallClockShiftToUtcRange } from "@/features/shifts/lib/wall-clock-shift-range";
import type { DaySchedule } from "./matching";

const SHIFT_HOURLY_RATE_SHARE_OF_REQUEST = 0.75;

export type ShiftLocationPayload = {
    address: string;
    lat:     number;
    lng:     number;
};

// Returned so confirm-and-charge can fan-out worker notifications
export type InsertedWorkerShift = {
    userId:      string;
    displayName: string;
    shiftId:     string;
    date:        string; // yyyy-MM-dd
    startTime:   string; // HH:mm wall-clock
    endTime:     string;
    startIso:    string;
    endIso:      string;
    hourlyRate:  number;
    location:    ShiftLocationPayload | null;
};

export type InsertShiftsResult =
    | { ok: true;  inserted: number; workerShifts: Map<string, InsertedWorkerShift[]> }
    | { ok: false; message: string };

export async function insertShiftsFromCoverage(params: {
    staffRequestId: string;
    facilityId:     string;
    hourlyRate:     number;
    schedule:       DaySchedule[];
    location:       ShiftLocationPayload | null;
}): Promise<InsertShiftsResult> {
    const supabase = await createAdminClient();

    // Collect all unique userIds across the schedule
    const userIds = [
        ...new Set(params.schedule.flatMap((d) => d.assignments.map((a) => a.userId))),
    ];
    if (userIds.length === 0) return { ok: true, inserted: 0, workerShifts: new Map() };

    const workerRes = await supabase.from("workers").select("id, user_id").in("user_id", userIds);

    if (workerRes.error || !workerRes.data?.length) {
        return { ok: false, message: workerRes.error?.message ?? "Could not resolve workers" };
    }

    const userToWorker = new Map(workerRes.data.map((w) => [w.user_id, w.id]));
    const facilityId   = params.facilityId;
    const shiftRate    =
        Number.isFinite(params.hourlyRate) && params.hourlyRate > 0
            ? Math.round(params.hourlyRate * SHIFT_HOURLY_RATE_SHARE_OF_REQUEST * 100) / 100
            : params.hourlyRate;

    type ShiftRow = {
        request_id:         string;
        facility_id:        string;
        worker_id:          string;
        start_time:         string;
        end_time:           string;
        hourly_rate:        number;
        status:             string;
        location:           ShiftLocationPayload | null;
        offered_worker_ids: string[];
    };

    // Build rows + a parallel metadata list so we can zip after insert
    const rows: ShiftRow[] = [];
    const meta: { userId: string; displayName: string; date: string; startTime: string; endTime: string; startIso: string; endIso: string }[] = [];

    for (const day of params.schedule) {
        for (const a of day.assignments) {
            const wid = userToWorker.get(a.userId);
            if (!wid) continue;

            const { startIso, endIso } = wallClockShiftToUtcRange(
                day.date, a.startTime, a.endTime,
            );

            rows.push({
                request_id:          params.staffRequestId,
                facility_id:         facilityId,
                worker_id:           wid,
                start_time:          startIso,
                end_time:            endIso,
                hourly_rate:         shiftRate,
                status:              "scheduled",
                location:            params.location,
                offered_worker_ids:  [a.userId],
            });

            meta.push({
                userId:      a.userId,
                displayName: a.displayName,
                date:        day.date,
                startTime:   a.startTime,
                endTime:     a.endTime,
                startIso,
                endIso,
            });
        }
    }

    if (rows.length === 0) return { ok: true, inserted: 0, workerShifts: new Map() };

    const { data: inserted, error } = await supabase
        .from("shifts")
        .insert(rows)
        .select("id");

    if (error || !inserted) return { ok: false, message: error?.message ?? "Insert failed" };

    // Group inserted shift IDs back to workers
    const workerShifts = new Map<string, InsertedWorkerShift[]>();
    for (let i = 0; i < inserted.length; i++) {
        const m = meta[i]!;
        const existing = workerShifts.get(m.userId) ?? [];
        existing.push({
            userId:      m.userId,
            displayName: m.displayName,
            shiftId:     inserted[i]!.id,
            date:        m.date,
            startTime:   m.startTime,
            endTime:     m.endTime,
            startIso:    m.startIso,
            endIso:      m.endIso,
            hourlyRate:  shiftRate,
            location:    params.location,
        });
        workerShifts.set(m.userId, existing);
    }

    return { ok: true, inserted: inserted.length, workerShifts };
}