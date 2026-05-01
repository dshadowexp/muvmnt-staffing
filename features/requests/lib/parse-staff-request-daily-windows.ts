import type { Json } from "@/supabase/types/database";

/** One segment within a calendar day (JSON shape). */
export type StaffRequestDaySlotJson = {
  startTime: string;
  endTime: string;
};

/** One calendar day with one or more segments (JSON / API shape). */
export type StaffRequestDayPlanJson = {
  date: string;
  slots: StaffRequestDaySlotJson[];
};

function isSlotRecord(v: unknown): v is StaffRequestDaySlotJson {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.startTime === "string" && typeof o.endTime === "string";
}

/** Legacy row: `{ date, startTime, endTime }` (single segment). */
function isLegacyFlatDay(v: unknown): v is { date: string; startTime: string; endTime: string } {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.date === "string" &&
    typeof o.startTime === "string" &&
    typeof o.endTime === "string" &&
    !Array.isArray(o.slots)
  );
}

function normalizeDayEntry(v: unknown): StaffRequestDayPlanJson | null {
  if (v === null || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.date !== "string") return null;
  if (Array.isArray(o.slots) && o.slots.length > 0) {
    const slots = o.slots.filter(isSlotRecord);
    if (slots.length === 0) return null;
    return { date: o.date, slots };
  }
  if (isLegacyFlatDay(v)) {
    return {
      date: v.date,
      slots: [{ startTime: v.startTime, endTime: v.endTime }],
    };
  }
  return null;
}

/** Parse `staff_requests.daily_time_windows` JSON into day plans (supports legacy flat rows). */
export function parseStaffRequestDailyWindows(
  raw: Json | null | undefined,
): StaffRequestDayPlanJson[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) return [];
  const out: StaffRequestDayPlanJson[] = [];
  for (const item of raw) {
    const d = normalizeDayEntry(item);
    if (d) out.push(d);
  }
  return out;
}

function slotsSignature(slots: StaffRequestDaySlotJson[]): string {
  return JSON.stringify(
    slots.map((s) => ({ a: s.startTime, b: s.endTime })).sort((x, y) => x.a.localeCompare(y.a)),
  );
}

/**
 * One-line label for cards (identical plan every day → compact; otherwise a short hint).
 */
export function formatStaffRequestDailyWindowsShort(
  plans: StaffRequestDayPlanJson[],
  formatTime: (hm: string) => string,
): string {
  if (plans.length === 0) return "—";
  const first = plans[0]!;
  const sig0 = slotsSignature(first.slots);
  const sameEveryDay = plans.every((p) => slotsSignature(p.slots) === sig0);
  if (!sameEveryDay) return "Varies by day";
  if (first.slots.length === 1) {
    const s = first.slots[0]!;
    return `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`;
  }
  return first.slots
    .map((s) => `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`)
    .join(", ");
}
