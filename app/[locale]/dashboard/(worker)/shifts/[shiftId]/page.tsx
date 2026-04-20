import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { Skeleton } from "@/components/ui/skeleton";
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

async function ShiftContent({
  shiftId,
  workerId,
}: {
  shiftId: string;
  workerId: string;
}) {
  const shift = await getShiftForWorker(shiftId, workerId);
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

  return (
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
          <dt className="text-muted-foreground text-sm font-medium">From</dt>
          <dd className="mt-0.5 text-sm">{expectedStart}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm font-medium">To</dt>
          <dd className="mt-0.5 text-sm">{expectedEnd}</dd>
        </div>
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
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default async function WorkerShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <BackLink backHref="/dashboard/shifts" title="Shifts" />

      <Suspense fallback={<DetailSkeleton />}>
        <ShiftContent shiftId={shiftId} workerId={worker.id} />
      </Suspense>
    </div>
  );
}
