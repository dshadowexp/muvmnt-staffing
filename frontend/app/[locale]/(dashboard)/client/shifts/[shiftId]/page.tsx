import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BackLink } from "@/components/back-link";
import { ShiftLocationDetails } from "@/features/shifts/components/shift-location-details";
import { ShiftStatusBadge } from "@/features/shifts/components/shift-status-badge";
import { ShiftTimeline } from "@/features/shifts/components/shift-timeline";
import { ClientShiftCompleteButton } from "@/features/shifts/components/client-shift-complete-button";
import { Separator } from "@/components/ui/separator";
import { getShiftForClientUser } from "@/features/shifts/dal/queries";
import { resolveWorkerPhotoSrc } from "@/features/shifts/lib/resolve-worker-photo-url";
import { isCheckedOutShiftStatus } from "@/features/shifts/lib/shift-status";
import {
  formatExpectedShiftEnd,
  formatExpectedShiftStart,
} from "@/features/shifts/lib/present-shift";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

function workerDisplayName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name.length > 0 ? name : "—";
}

function workerInitials(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const a = (first?.trim()?.[0] ?? "").toUpperCase();
  const b = (last?.trim()?.[0] ?? "").toUpperCase();
  const pair = `${a}${b}`;
  return pair.length > 0 ? pair : "?";
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
  const workerPhotoSrc = await resolveWorkerPhotoSrc(shift.workers?.photo_url);

  const showComplete = isCheckedOutShiftStatus(shift.status);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <BackLink backHref="/client" title="Shifts" />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Shift details</h1>
          <ShiftStatusBadge status={shift.status} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-2">
            <dt className="text-muted-foreground text-sm font-medium">Worker</dt>
            <dd className="mt-0.5 flex items-center gap-2 text-sm">
              <Avatar size="sm" className="shrink-0">
                {workerPhotoSrc ? (
                  <AvatarImage
                    src={workerPhotoSrc}
                    alt={workerName === "—" ? "Worker" : workerName}
                  />
                ) : null}
                <AvatarFallback className="text-[10px] font-medium">
                  {workerInitials(
                    shift.workers?.first_name,
                    shift.workers?.last_name,
                  )}
                </AvatarFallback>
              </Avatar>
              <span>{workerName}</span>
            </dd>
          </div>
          <div className="col-span-2">
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
        </dl>

        <ShiftTimeline
          shift={{
            created_at: shift.created_at,
            confirm_time: shift.confirm_time,
            checkin_time: shift.checkin_time,
            checkout_time: shift.checkout_time,
            complete_time: shift.complete_time,
          }}
        />

        {showComplete ? (
          <>
            <div>
              <h2 className="mb-4 text-lg font-semibold">Actions</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ClientShiftCompleteButton shiftId={shift.id} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
