/**
 * North American **Eastern** wall clock for staff requests and `shifts.start_time` / `end_time`
 * semantics. `America/Toronto` follows the same DST rules as `America/New_York` (US Eastern).
 * Values are stored in Postgres as `timestamptz` (UTC); conversion happens at insert/read.
 */
export const SHIFT_SCHEDULE_TIMEZONE = 'America/Toronto';
