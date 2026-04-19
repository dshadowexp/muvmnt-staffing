import { nextContinuationSlot } from "@/features/availability/lib/week-state";

/** Append a short interval after the previous slot’s end (same idea as availability). */
export function nextStaffRequestSlotAfter(lastEndTime: string): {
  startTime: string;
  endTime: string;
} {
  const s = nextContinuationSlot(lastEndTime);
  return { startTime: s.start, endTime: s.end };
}
