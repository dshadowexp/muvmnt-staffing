import type { ShiftRow } from "@/features/shifts/dal/queries";

export type ShiftTimelineEvent = {
  id: string;
  label: string;
  at: string;
};

export type ShiftTimelineFields = Pick<
  ShiftRow,
  "created_at" | "confirm_time" | "checkin_time" | "checkout_time" | "complete_time"
>;

export type ShiftTimelineAudience = "client" | "worker";

/** Chronological list of milestone timestamps for the shift detail UI. */
export function buildShiftTimelineEvents(
  shift: ShiftTimelineFields,
  audience: ShiftTimelineAudience = "client",
): ShiftTimelineEvent[] {
  const confirmLabel =
    audience === "worker" ? "You accepted this shift" : "Worker accepted shift";
  const items: ShiftTimelineEvent[] = [
    { id: "created", label: "Shift booked", at: shift.created_at },
  ];
  if (shift.confirm_time != null && shift.confirm_time !== "") {
    items.push({
      id:      "confirm",
      label:   confirmLabel,
      at:      shift.confirm_time,
    });
  }
  if (shift.checkin_time != null && shift.checkin_time !== "") {
    items.push({ id: "checkin", label: "Checked in", at: shift.checkin_time });
  }
  if (shift.checkout_time != null && shift.checkout_time !== "") {
    items.push({ id: "checkout", label: "Checked out", at: shift.checkout_time });
  }
  if (shift.complete_time != null && shift.complete_time !== "") {
    items.push({
      id:      "complete",
      label:   "Marked complete by client",
      at:      shift.complete_time,
    });
  }
  return items.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
