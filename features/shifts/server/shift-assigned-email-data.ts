import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { InsertedWorkerShift } from "@/features/requests/server/shifts";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import type { WorkerResponseWindow } from "@/features/shifts/lib/worker-response-window";

/**
 * Email template payload for `shift-assigned` (initial booking + re-offers).
 */
export function formatShiftAssignedEmailPayload(params: {
  shifts: InsertedWorkerShift[];
  clientName: string;
  requirements: string[];
  tasks: string[];
  acceptUrl: string;
  declineUrl: string;
  window: WorkerResponseWindow;
}) {
  const { shifts, clientName, requirements, tasks, acceptUrl, declineUrl, window } =
    params;

  const formattedShifts = shifts
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      dateLine: formatInTimeZone(
        parseISO(`${s.date}T12:00:00Z`),
        SHIFT_SCHEDULE_TIMEZONE,
        "EEEE, MMM d",
      ),
      timeLine: `${s.startTime} – ${s.endTime}`,
    }));

  return {
    previewText: `New shift${shifts.length > 1 ? "s" : ""} from ${clientName.trim() || "ReadyKare"} — respond by ${window.deadlineFormatted}`,
    workerFirstName: shifts[0]!.displayName.split(" ")[0]!,
    clientName: clientName.trim() || "ReadyKare",
    shiftCount: shifts.length,
    multipleShifts: shifts.length > 1,
    address: shifts[0]!.location?.address ?? "TBD",
    rateLine: `$${shifts[0]!.hourlyRate.toFixed(2)}/hr`,
    requirements: requirements.length ? requirements.join(", ") : null,
    tasks: tasks.length ? tasks.join(", ") : null,
    shifts: formattedShifts,
    acceptUrl,
    declineUrl,
    responseDeadlineFormatted: window.deadlineFormatted,
    relativeResponsePhrase: window.relativePhrase,
    responseSummaryLine: window.responseSummaryLine,
  };
}

export function shiftAssignedEmailSubject(
  shiftCount: number,
  window: WorkerResponseWindow,
): string {
  const unit = shiftCount === 1 ? "shift" : "shifts";
  return `New ${unit} assigned — respond by ${window.deadlineFormatted}`;
}
