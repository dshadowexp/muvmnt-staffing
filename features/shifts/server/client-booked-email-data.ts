import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { DaySchedule } from "@/features/requests/server/matching";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";

export function formatClientBookedEmailData(params: {
  clientName: string;
  requestId: string;
  schedule: DaySchedule[];
  hourlyRate: number;
  totalShifts: number;
}) {
  const { clientName, requestId, schedule, hourlyRate, totalShifts } = params;

  const coveredDates = schedule
    .filter((d) => d.assignments.length > 0)
    .map((d) => d.date)
    .sort();

  const formatDate = (ymd: string) =>
    formatInTimeZone(parseISO(`${ymd}T12:00:00Z`), SHIFT_SCHEDULE_TIMEZONE, "MMM d");

  const scheduleLine =
    coveredDates.length === 0
      ? "TBD"
      : coveredDates.length === 1
        ? formatDate(coveredDates[0]!)
        : `${formatDate(coveredDates[0]!)} – ${formatDate(coveredDates[coveredDates.length - 1]!)}`;

  const dayCount = coveredDates.length;
  const shiftsLine = `${totalShifts} shift${totalShifts !== 1 ? "s" : ""} across ${dayCount} day${dayCount !== 1 ? "s" : ""}`;

  const rateLine = `$${hourlyRate.toFixed(2)}/hr`;

  return {
    previewText: `Your staff request is confirmed — ${shiftsLine}`,
    name: clientName,
    scheduleLine,
    shiftsLine,
    rateLine,
    requestId,
    requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/requests/${requestId}`,
  };
}
