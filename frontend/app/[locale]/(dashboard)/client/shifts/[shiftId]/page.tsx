import { BackLink } from "@/components/back-link";
import { ShiftLocationDetails } from "@/features/shifts/components/shift-location-details";
import { ShiftStatusBadge } from "@/features/shifts/components/shift-status-badge";
import { STAFF_REQUEST_DISPLAY_TITLE } from "@/features/requests/constants";
import { ClientShiftCompleteButton } from "@/features/shifts/components/client-shift-complete-button";
import { getShiftForClientUser } from "@/features/shifts/dal/queries";
import { isCheckedOutShiftStatus } from "@/features/shifts/lib/shift-status";
import {
  effectiveHourlyRate,
  formatExpectedShiftEnd,
  formatExpectedShiftStart,
  formatShiftPay,
  shiftHoursBetween,
} from "@/features/shifts/lib/present-shift";
import { formatJobHourlyRateLine } from "@/lib/formatters";
import { format, isValid, parseISO } from "date-fns";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

function workerDisplayName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name.length > 0 ? name : "—";
}

export default async function ClientShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "client") redirect("/app");

  const shift = await getShiftForClientUser(shiftId, session.userId);
  if (shift == null) notFound();

  const sr = shift.staff_requests;
  const rate = effectiveHourlyRate(shift.hourly_rate, sr?.pricing_rate);
  const hours = shiftHoursBetween(shift.start_time, shift.end_time);
  const { payLabel } = formatShiftPay(hours, rate);
  const expectedStart = formatExpectedShiftStart(
    shift.start_time,
    sr?.start_date ?? null,
  );
  const expectedEnd = formatExpectedShiftEnd(
    shift.end_time,
    sr?.start_date ?? null,
  );
  const workerName = workerDisplayName(
    shift.workers?.first_name,
    shift.workers?.last_name,
  );

  function formatActualTime(value: string | null | undefined): string {
    if (value == null || value === "") return "—";
    const normalized = /^\d{4}-\d{2}-\d{2}\s+\d/.test(value.trim())
      ? value.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
      : value.trim();
    const d = parseISO(normalized);
    if (!isValid(d)) return value;
    return format(d, "MMM d, yyyy · h:mm a");
  }

  const showComplete = isCheckedOutShiftStatus(shift.status);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <BackLink backHref="/client/shifts" title="Shifts" />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Shift details</h1>
          <ShiftStatusBadge status={shift.status} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Worker</dt>
            <dd className="mt-0.5 text-sm">{workerName}</dd>
          </div>
          <div>
            <ShiftLocationDetails location={shift.location} />
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Expected start</dt>
            <dd className="mt-0.5 text-sm">{expectedStart}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Expected end</dt>
            <dd className="mt-0.5 text-sm">{expectedEnd}</dd>
          </div>
          
          {(shift.checkin_time != null && shift.checkin_time !== "") ||
          (shift.checkout_time != null && shift.checkout_time !== "") ? (
            <>
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Check-in time</dt>
                <dd className="mt-0.5 text-sm tabular-nums">{formatActualTime(shift.checkin_time)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Check-ou time</dt>
                <dd className="mt-0.5 text-sm tabular-nums">{formatActualTime(shift.checkout_time)}</dd>
              </div>
            </>
          ) : null}
        </dl>

        {showComplete ? (
          <div className="border-border flex flex-col gap-3 border-t pt-6">
            <p className="text-muted-foreground text-sm">
              The worker has checked out. Confirm completion to close this shift and release payment
              to their payroll account.
            </p>
            <ClientShiftCompleteButton shiftId={shift.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
