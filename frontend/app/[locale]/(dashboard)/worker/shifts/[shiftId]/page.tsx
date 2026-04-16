import { BackLink } from "@/components/back-link";
import { ShiftLocationDetails } from "@/features/shifts/components/shift-location-details";
import { ShiftStatusBadge } from "@/features/shifts/components/shift-status-badge";
import { ShiftTimeline } from "@/features/shifts/components/shift-timeline";
import { Separator } from "@/components/ui/separator";
import { getShiftForWorker } from "@/features/shifts/dal/queries";
import {
  effectiveHourlyRate,
  formatExpectedShiftEnd,
  formatExpectedShiftStart,
  formatShiftPay,
  shiftHoursBetween,
} from "@/features/shifts/lib/present-shift";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { formatJobHourlyRateLine } from "@/lib/formatters";
import { notFound, redirect } from "next/navigation";
import { WorkerShiftActions } from "./_client";
import { format, isValid, parseISO } from "date-fns";

export default async function WorkerShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const shift = await getShiftForWorker(shiftId, worker.id);
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
  const clientName = shift.clients?.name?.trim() || "—";

  function formatActualTime(value: string | null | undefined): string {
    if (value == null || value === "") return "—";
    const normalized = /^\d{4}-\d{2}-\d{2}\s+\d/.test(value.trim())
      ? value.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
      : value.trim();
    const d = parseISO(normalized);
    if (!isValid(d)) return value;
    return format(d, "MMM d, yyyy · h:mm a");
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <BackLink backHref="/worker/shifts" title="Shifts" />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Shift details</h1>
          <ShiftStatusBadge status={shift.status} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Client</dt>
            <dd className="mt-0.5 text-sm">{clientName}</dd>
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
                <dt className="text-muted-foreground text-sm font-medium">Actual check-in</dt>
                <dd className="mt-0.5 text-sm tabular-nums">{formatActualTime(shift.checkin_time)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Actual check-out</dt>
                <dd className="mt-0.5 text-sm tabular-nums">{formatActualTime(shift.checkout_time)}</dd>
              </div>
            </>
          ) : null}
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Rate</dt>
            <dd className="mt-0.5 text-sm tabular-nums">
              {formatJobHourlyRateLine(rate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">
              Estimated pay
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{payLabel}</dd>
          </div>
          
        </dl>

        <ShiftTimeline
          audience="worker"
          shift={{
            created_at: shift.created_at,
            confirm_time: shift.confirm_time,
            checkin_time: shift.checkin_time,
            checkout_time: shift.checkout_time,
            complete_time: shift.complete_time,
          }}
        />

        <Separator />
        <div>
          <h2 className="mb-4 text-lg font-semibold">Actions</h2>
          <WorkerShiftActions shiftId={shift.id} status={shift.status} />
        </div>
      </div>
    </div>
  );
}
