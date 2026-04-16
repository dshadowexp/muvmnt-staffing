import { formatInTimeZone } from 'date-fns-tz';
import { SHIFT_SCHEDULE_TIMEZONE } from './shift-timezone.constants';

function addressFromLocation(raw: unknown): string {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return '—';
  const o = raw as Record<string, unknown>;
  const address = typeof o.address === 'string' ? o.address.trim() : '';
  if (address.length > 0) return address;
  const lat = typeof o.lat === 'number' ? o.lat : Number(o.lat);
  const lng = typeof o.lng === 'number' ? o.lng : Number(o.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  return '—';
}

/** Single-line schedule for email (Eastern). */
export function formatShiftScheduleLine(
  startIso: string | null,
  endIso: string | null,
): string {
  if (!startIso) return '—';
  const s = new Date(startIso);
  if (Number.isNaN(s.getTime())) return '—';
  if (!endIso) {
    return formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, "EEE, MMM d, yyyy · h:mm a");
  }
  const e = new Date(endIso);
  if (Number.isNaN(e.getTime())) {
    return formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, "EEE, MMM d, yyyy · h:mm a");
  }
  const sameDay =
    formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, 'yyyy-MM-dd')
    === formatInTimeZone(e, SHIFT_SCHEDULE_TIMEZONE, 'yyyy-MM-dd');
  if (sameDay) {
    return `${formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, "EEE, MMM d, yyyy")} · ${formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, 'h:mm a')} – ${formatInTimeZone(e, SHIFT_SCHEDULE_TIMEZONE, 'h:mm a')}`;
  }
  return `${formatInTimeZone(s, SHIFT_SCHEDULE_TIMEZONE, "MMM d, h:mm a")} – ${formatInTimeZone(e, SHIFT_SCHEDULE_TIMEZONE, "MMM d, h:mm a")}`;
}

export function formatShiftRateLine(hourlyRate: number | null): string {
  if (hourlyRate == null || !Number.isFinite(hourlyRate) || hourlyRate <= 0) return '—';
  return `$${hourlyRate.toFixed(2)}/hr CAD`;
}

export { addressFromLocation };
