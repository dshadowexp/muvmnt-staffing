import { formatInTimeZone } from 'date-fns-tz';
import { SHIFT_SCHEDULE_TIMEZONE } from './shift-timezone.constants';

/** Parse shift `start_time` / `end_time` (UTC instants) into calendar date + HH:mm in {@link SHIFT_SCHEDULE_TIMEZONE}. */
export function shiftWindowFromTimestamps(
  startTime: string | null,
  endTime:   string | null,
): { dateYmd: string; startHHmm: string; endHHmm: string } | null {
  if (!startTime || !endTime) return null;
  const s = new Date(startTime);
  const e = new Date(endTime);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const dateYmd = formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, 'yyyy-MM-dd');
  const startHHmm = formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, 'HH:mm');
  const endHHmm = formatInTimeZone(e, SHIFT_SCHEDULE_TIMEZONE, 'HH:mm');
  return { dateYmd, startHHmm, endHHmm };
}
