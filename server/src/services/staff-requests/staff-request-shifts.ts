import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { supabase } from '../../config/supabase';
import { SHIFT_SCHEDULE_TIMEZONE } from '../shifts/shift-timezone.constants';
import type { InsertedShiftRow } from '../shifts/shift-assignment-email.service';

/** Stored on each shift as `hourly_rate` (worker side); remainder is platform margin. */
const SHIFT_HOURLY_RATE_SHARE_OF_REQUEST = 0.75;

export type ShiftLocationPayload = {
  address: string;
  lat: number;
  lng: number;
};

function hhmmToMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

function addOneCalendarDayYmd(dateYmd: string): string {
  const anchor = parseISO(`${dateYmd}T12:00:00.000Z`);
  return formatInTimeZone(addDays(anchor, 1), 'UTC', 'yyyy-MM-dd');
}

/**
 * Interprets `startHhmm` / `endHhmm` as **Eastern** ({@link SHIFT_SCHEDULE_TIMEZONE}) wall clock
 * on `dateYmd`, returns UTC ISO strings for `timestamptz`.
 * If end is earlier than start on the same clock (overnight), end is taken as the **next** calendar day.
 */
function easternWallClockShiftToUtcRange(
  dateYmd: string,
  startHhmm: string,
  endHhmm: string,
): { startIso: string; endIso: string } {
  const startM = hhmmToMinutes(startHhmm);
  const endM = hhmmToMinutes(endHhmm);
  const endYmd = endM < startM ? addOneCalendarDayYmd(dateYmd) : dateYmd;

  const pad = (n: number) => String(n).padStart(2, '0');
  const toIso = (ymd: string, hhmm: string): string => {
    const [h, mi] = [Number(hhmm.split(':')[0] ?? 0), Number(hhmm.split(':')[1] ?? 0)];
    const localNoTz = `${ymd}T${pad(h)}:${pad(mi)}:00`;
    return toDate(localNoTz, { timeZone: SHIFT_SCHEDULE_TIMEZONE }).toISOString();
  };

  return {
    startIso: toIso(dateYmd, startHhmm),
    endIso:   toIso(endYmd, endHhmm),
  };
}

/**
 * Materializes one `shifts` row per assignment segment in the proposed coverage.
 * `clientId` is `clients.id` (FK on `shifts.client_id`). `workers.user_id` → `workers.id` for `worker_id`.
 */
export async function insertShiftsFromProposedCoverage(params: {
  staffRequestId: string;
  clientId:       string;
  hourlyRate:     number;
  schedule:       import('./matching.service').DaySchedule[];
  location:       ShiftLocationPayload | null;
}): Promise<
  | { ok: true; inserted: number; rows: InsertedShiftRow[] }
  | { ok: false; message: string }
> {
  const userIds = [...new Set(params.schedule.flatMap(d => d.assignments.map(a => a.userId)))];
  if (userIds.length === 0) return { ok: true, inserted: 0, rows: [] };

  const { data: workerRows, error: wErr } = await supabase
    .from('workers')
    .select('id, user_id')
    .in('user_id', userIds);

  if (wErr || !workerRows?.length) {
    return { ok: false, message: wErr?.message ?? 'Could not resolve workers for shifts' };
  }

  const shiftHourlyRate =
    Number.isFinite(params.hourlyRate) && params.hourlyRate > 0
      ? Math.round(params.hourlyRate * SHIFT_HOURLY_RATE_SHARE_OF_REQUEST * 100) / 100
      : params.hourlyRate;

  const userToWorker = new Map(workerRows.map(w => [w.user_id, w.id]));

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
        request_id:  params.staffRequestId,
        client_id:   params.clientId,
        worker_id:   wid,
        start_time:  startIso,
        end_time:    endIso,
        hourly_rate: shiftHourlyRate,
        status:      'scheduled',
        location:    params.location,
      });
    }
  }

  if (rows.length === 0) return { ok: true, inserted: 0, rows: [] };

  const { data: inserted, error } = await supabase
    .from('shifts')
    .insert(rows)
    .select('id, worker_id, start_time, end_time, hourly_rate, location');

  if (error) return { ok: false, message: error.message };
  const list = (inserted ?? []) as InsertedShiftRow[];
  return { ok: true, inserted: list.length, rows: list };
}
