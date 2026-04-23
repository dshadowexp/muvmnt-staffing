import { Suspense, type ReactNode } from "react";
import { format } from "date-fns";
import {
  CalendarRangeIcon,
  DollarSignIcon,
  ListChecksIcon,
  MapPinIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BackLink } from "@/components/back-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { STAFF_REQUEST_STATUS_CONFIRMED } from "@/features/requests/constants";
import {
  getStaffRequestSiteForWorker,
  getStaffRequestSummaryForWorker,
  type StaffRequestSiteRow,
} from "@/features/requests/dal/worker-request-queries";
import { WorkerStaffRequestActions } from "@/features/requests/components/worker-staff-request-actions";
import { AssignmentResponseTimer } from "@/features/shifts/components/assignment-response-timer";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { listShiftsForWorkerOnRequest } from "@/features/shifts/dal/queries";
import { attachResolvedWorkerPhotos } from "@/features/shifts/lib/resolve-worker-photo-url";
import {
  effectiveHourlyRate,
  shiftHoursBetween,
} from "@/features/shifts/lib/present-shift";
import {
  SHIFT_STATUS_SCHEDULED,
  normalizeShiftStatus,
} from "@/features/shifts/constants";
import { formatCurrency, formatJobHourlyRateLine } from "@/lib/formatters";
import { normalizeProfessionId } from "@/lib/professions";

function formatDateRange(startIso: string, endIso: string | null): string {
  const start = format(new Date(startIso), "MMM d, yyyy");
  if (!endIso) return start;
  const end = format(new Date(endIso), "MMM d, yyyy");
  return start === end ? start : `${start} – ${end}`;
}

function formatSiteAddress(loc: StaffRequestSiteRow | null): string | null {
  if (loc == null) return null;
  const single = loc.address?.trim();
  if (single) return single;
  const parts = [
    loc.address_line_1,
    loc.address_line_2,
    [loc.city, loc.admin_area].filter(Boolean).join(", ") || null,
    loc.postal_code,
    loc.country_code,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : null;
}

function InfoTile({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPinIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="text-muted-foreground mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        <Icon className="size-3.5" aria-hidden />
        {title}
      </div>
      {children}
    </div>
  );
}

function workerEarningsSummary(
  shifts: Awaited<ReturnType<typeof listShiftsForWorkerOnRequest>>,
): { total: number; rates: number[] } {
  let total = 0;
  const rates: number[] = [];
  for (const row of shifts) {
    const sr = row.staff_requests;
    const hours = shiftHoursBetween(row.start_time, row.end_time);
    const rate = effectiveHourlyRate(row.hourly_rate, sr?.pricing_rate);
    if (hours != null && hours > 0 && rate != null && rate > 0) {
      total += hours * rate;
      rates.push(rate);
    }
  }
  return { total, rates };
}

function hourlyLineFromRates(rates: number[]): string {
  if (rates.length === 0) return "—";
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min === max) return formatJobHourlyRateLine(min);
  return `${formatJobHourlyRateLine(min)} – ${formatJobHourlyRateLine(max)}`;
}

/** Earliest `shifts.created_at` among scheduled shifts (same basis as home “shift request” cards). */
function earliestScheduledAssignmentCreatedAt(
  shifts: Awaited<ReturnType<typeof listShiftsForWorkerOnRequest>>,
): string | null {
  let earliest: string | null = null;
  for (const s of shifts) {
    if (normalizeShiftStatus(s.status) !== SHIFT_STATUS_SCHEDULED) continue;
    const created = s.created_at;
    if (typeof created !== "string" || !created) continue;
    if (
      earliest === null ||
      new Date(created).getTime() < new Date(earliest).getTime()
    ) {
      earliest = created;
    }
  }
  return earliest;
}

async function SiteTile({
  requestId,
  workerId,
}: {
  requestId: string;
  workerId: string;
}) {
  const t = await getTranslations("dashboard.worker.requestDetail");
  const res = await getStaffRequestSiteForWorker(requestId, workerId);
  if (!res) return null;
  const addressLine = formatSiteAddress(res.location);

  return (
    <InfoTile icon={MapPinIcon} title={t("siteTitle")}>
      {addressLine ? (
        <div className="space-y-1">
          <p className="text-foreground text-sm">{addressLine}</p>
          {res.location?.instructions ? (
            <p className="text-muted-foreground text-xs leading-snug">
              {res.location.instructions}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("siteNone")}</p>
      )}
    </InfoTile>
  );
}

function SiteTileSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-4"
      aria-busy="true"
    >
      <Skeleton className="h-4 w-20" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

async function ShiftsSection({
  requestId,
  workerId,
}: {
  requestId: string;
  workerId: string;
}) {
  const t = await getTranslations("dashboard.worker.requestDetail");
  const shiftsRaw = await listShiftsForWorkerOnRequest(workerId, requestId);
  const shifts = await attachResolvedWorkerPhotos(shiftsRaw);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("shiftsTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("shiftsDescription")}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <ShiftsTable rows={shifts} variant="worker-request" />
      </div>
    </section>
  );
}

function ShiftsSectionSkeleton() {
  return (
    <section className="space-y-3" aria-busy="true">
      <div className="space-y-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="rounded-xl border border-border p-4">
        <Skeleton className="h-32 w-full" />
      </div>
    </section>
  );
}

function StaffRequestDetails({
  staffRequest,
}: {
  staffRequest: NonNullable<
    Awaited<ReturnType<typeof getStaffRequestSummaryForWorker>>
  >;
}) {
  const hasReqs = staffRequest.requirements.length > 0;
  const hasTasks = staffRequest.tasks.length > 0;
  const hasNotes = (staffRequest.notes ?? "").trim().length > 0;

  if (!hasReqs && !hasTasks && !hasNotes) return null;

  const defaultValue = hasReqs
    ? ["requirements"]
    : hasTasks
      ? ["tasks"]
      : ["notes"];

  return (
    <Accordion type="multiple" className="w-full" defaultValue={defaultValue}>
      {hasReqs ? (
        <AccordionItem value="requirements">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2">
              <ListChecksIcon className="size-4 shrink-0" />
              Requirements
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-muted-foreground mb-2 text-xs">
              Credentials and qualifications needed for this role
            </p>
            <ul className="flex flex-wrap gap-2">
              {staffRequest.requirements.map((req) => (
                <li key={req}>
                  <Badge variant="secondary" className="font-normal">
                    {req}
                  </Badge>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {hasTasks ? (
        <AccordionItem value="tasks">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2">
              <CheckCircle2Icon className="size-4 shrink-0" />
              Tasks &amp; Responsibilities
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-muted-foreground mb-3 text-xs">
              Day-to-day duties for this position
            </p>
            <ul className="space-y-2">
              {staffRequest.tasks.map((task, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {hasNotes ? (
        <AccordionItem value="notes">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            Additional Notes
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">
              {staffRequest.notes}
            </p>
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  );
}

export async function StaffRequestWorkerDetail({
  requestId,
  workerId,
}: {
  requestId: string;
  workerId: string;
}) {
  const [staffRequest, shiftsForActions, t, tProf] = await Promise.all([
    getStaffRequestSummaryForWorker(requestId, workerId),
    listShiftsForWorkerOnRequest(workerId, requestId),
    getTranslations("dashboard.worker.requestDetail"),
    getTranslations("professions"),
  ]);

  if (!staffRequest) notFound();
  if (staffRequest.status !== STAFF_REQUEST_STATUS_CONFIRMED) notFound();

  const professionLabel = tProf(normalizeProfessionId(staffRequest.profession));
  const { total, rates } = workerEarningsSummary(shiftsForActions);
  const hasScheduled = shiftsForActions.some(
    (s) => normalizeShiftStatus(s.status) === SHIFT_STATUS_SCHEDULED,
  );
  const scheduledAssignedAtIso =
    earliestScheduledAssignmentCreatedAt(shiftsForActions);

  return (
    <div className="w-full max-w-5xl space-y-8">
      <BackLink backHref="/dashboard/shifts" title={t("backTitle")} />

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("requestLabel")} #{staffRequest.id.substring(0, 8)}
            </p>
          </div>
          {scheduledAssignedAtIso ? (
            <AssignmentResponseTimer assignedAtIso={scheduledAssignedAtIso} />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 font-normal">
            {professionLabel}
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal">
            <CalendarRangeIcon className="size-3.5" />
            {formatDateRange(staffRequest.start_date, staffRequest.end_date)}
          </Badge>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <InfoTile icon={DollarSignIcon} title={t("yourEarningsTitle")}>
          <p className="text-foreground text-lg font-semibold tabular-nums">
            {formatCurrency(total, "CAD")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("hourlyRateLabel", { range: hourlyLineFromRates(rates) })}
          </p>
        </InfoTile>
        <Suspense fallback={<SiteTileSkeleton />}>
          <SiteTile requestId={requestId} workerId={workerId} />
        </Suspense>
      </section>

      <StaffRequestDetails staffRequest={staffRequest} />

      <Separator />

      <Suspense fallback={<ShiftsSectionSkeleton />}>
        <ShiftsSection requestId={requestId} workerId={workerId} />
      </Suspense>

      {hasScheduled ? <Separator /> : null}

      <WorkerStaffRequestActions
        requestId={requestId}
        hasScheduledShifts={hasScheduled}
      />
    </div>
  );
}
