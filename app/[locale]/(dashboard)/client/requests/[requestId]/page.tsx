import { Suspense } from "react";
import { format } from "date-fns";
import {
  ArrowRightIcon,
  CalendarRangeIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  DollarSignIcon,
  ListChecksIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { BackLink } from "@/components/back-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

import {
  STAFF_REQUEST_STATUS_CONFIRMED,
  STAFF_REQUEST_STATUS_PENDING_PRICING,
} from "@/features/requests/constants";
import {
  getStaffRequest,
  getStaffRequestSiteAndPayments,
  type StaffRequestSiteAndPayments,
} from "@/features/requests/dal/queries";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { listShiftsForStaffRequest } from "@/features/shifts/dal/queries";
import { attachResolvedWorkerPhotos } from "@/features/shifts/lib/resolve-worker-photo-url";
import { formatCurrency, formatJobHourlyRateLine } from "@/lib/formatters";

type StaffRequestRow = NonNullable<
  Awaited<ReturnType<typeof getStaffRequest>>["data"]
>;

const ACTION_OPTIONS = [
  {
    label: "Generate Report",
    description: "Generate a report for this staff request.",
    href: "report",
  },
] as const;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function StaffRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId: id } = await params;

  // Resume the wizard for any non-confirmed request — drop the user back at
  // whichever step they left off at.
  const resume = await getStaffRequest(id);
  if (resume.error || resume.data == null) notFound();

  const staffRequest = resume.data;
  if (staffRequest.status !== STAFF_REQUEST_STATUS_CONFIRMED) {
    if (
      staffRequest.status === STAFF_REQUEST_STATUS_PENDING_PRICING ||
      staffRequest.pricing_tier == null
    ) {
      redirect(`/client/requests/${id}/pricing`);
    }
    redirect(`/client/requests/${id}/coverage`);
  }

  return (
    <div className="w-full max-w-5xl space-y-8">
      <BackLink backHref="/app" title="Staff requests" />

      <StaffRequestHeader staffRequest={staffRequest} />

      <Suspense fallback={<SiteAndBillingSkeleton />}>
        <SiteAndBillingSection requestId={id} />
      </Suspense>

      <Separator />

      <Suspense fallback={<ShiftsSectionSkeleton />}>
        <ShiftsSection requestId={id} />
      </Suspense>

      <StaffRequestDetails staffRequest={staffRequest} />

      <Separator />

      <ActionsSection requestId={id} />
    </div>
  );
}

// ─── Header (rendered immediately — row already loaded for the redirect) ──────

function StaffRequestHeader({
  staffRequest,
}: {
  staffRequest: StaffRequestRow;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Staff request
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            #{staffRequest.id.substring(0, 8)}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {staffRequest.pricing_tier ? (
          <Badge variant="outline" className="gap-1 font-normal">
            {staffRequest.pricing_tier}
          </Badge>
        ) : null}
        <Badge variant="outline" className="gap-1 font-normal">
          <DollarSignIcon className="size-3.5" />
          {formatJobHourlyRateLine(staffRequest.pricing_rate)}
        </Badge>
        <Badge variant="outline" className="gap-1 font-normal">
          <UserIcon className="size-3.5" />
          {`${staffRequest.positions} /shift`}
        </Badge>
        <Badge variant="outline" className="gap-1 font-normal">
          <CalendarRangeIcon className="size-3.5" />
          {formatDateRange(staffRequest.start_date, staffRequest.end_date)}
        </Badge>
      </div>
    </header>
  );
}

function formatDateRange(startIso: string, endIso: string | null): string {
  const start = format(new Date(startIso), "MMM d, yyyy");
  if (!endIso) return start;
  const end = format(new Date(endIso), "MMM d, yyyy");
  return start === end ? start : `${start} – ${end}`;
}

// ─── Site + Billing (independently suspended) ─────────────────────────────────

async function SiteAndBillingSection({ requestId }: { requestId: string }) {
  const result = await getStaffRequestSiteAndPayments(requestId);
  const data: StaffRequestSiteAndPayments =
    result.error || result.data == null
      ? { location: null, payments: [] }
      : result.data;

  const addressLine = formatSiteAddress(data.location);

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <InfoTile icon={MapPinIcon} title="Site">
        {addressLine ? (
          <p className="text-foreground text-sm">{addressLine}</p>
        ) : (
          <p className="text-muted-foreground text-sm">Not on file</p>
        )}
      </InfoTile>

      <InfoTile icon={CreditCardIcon} title="Billing">
        {data.payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No charges recorded yet.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
              >
                <span className="text-muted-foreground tabular-nums">
                  {format(new Date(p.created_at), "MMM d, yyyy")}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(
                    (p.amount_cents ?? 0) / 100,
                    p.currency.toUpperCase(),
                  )}
                </span>
                {p.card_display ? (
                  <span className="text-muted-foreground text-xs">
                    {p.card_display}
                  </span>
                ) : null}
                <span className="text-muted-foreground text-xs capitalize">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </InfoTile>
    </section>
  );
}

function SiteAndBillingSkeleton() {
  return (
    <section className="grid gap-3 md:grid-cols-2" aria-busy="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card px-4 py-4"
        >
          <Skeleton className="h-4 w-20" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </section>
  );
}

function formatSiteAddress(
  loc: StaffRequestSiteAndPayments["location"],
): string | null {
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
  children: React.ReactNode;
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

// ─── Shifts (independently suspended) ─────────────────────────────────────────

async function ShiftsSection({ requestId }: { requestId: string }) {
  const shiftsRaw = await listShiftsForStaffRequest(requestId);
  const shifts = await attachResolvedWorkerPhotos(shiftsRaw);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Shifts</h2>
        <p className="text-muted-foreground text-sm">
          Workers and hours booked under this staff request.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <ShiftsTable rows={shifts} variant="client-request" />
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
      <div className="rounded-xl border border-border">
        <div className="border-b border-border bg-muted/40 px-4 py-2">
          <Skeleton className="h-4 w-40" />
        </div>
        <ul className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Requirements / Tasks / Notes (no async work) ─────────────────────────────

function StaffRequestDetails({
  staffRequest,
}: {
  staffRequest: StaffRequestRow;
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

// ─── Actions ──────────────────────────────────────────────────────────────────

function ActionsSection({ requestId }: { requestId: string }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTION_OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={`/client/requests/${requestId}/${option.href}`}
            className="group block transition-opacity hover:opacity-90"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{option.label}</CardTitle>
                  <CardDescription className="mt-1">
                    {option.description}
                  </CardDescription>
                </div>
                <ArrowRightIcon className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
