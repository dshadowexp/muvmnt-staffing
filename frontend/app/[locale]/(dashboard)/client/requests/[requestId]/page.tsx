import { BackLink } from "@/components/back-link";
import { SuspendedItem } from "@/components/suspended-item";
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
import {
  getStaffRequest,
  getStaffRequestSiteAndPayments,
  type StaffRequestSiteAndPayments,
} from "@/features/requests/dal/queries";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { listShiftsForStaffRequest } from "@/features/shifts/dal/queries";
import { attachResolvedWorkerPhotos } from "@/features/shifts/lib/resolve-worker-photo-url";
import type { ShiftTableRow } from "@/features/shifts/types/shift-table-row";
import { formatCurrency, formatJobHourlyRateLine } from "@/lib/formatters";
import { format } from "date-fns";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  ListChecksIcon,
  UserIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";

const options = [
  {
    label: "Extend Request",
    description: "Extend the request for the same staff again.",
    href: "extend",
  },
  {
    label: "Generate Report",
    description: "Generate a report for this staff request.",
    href: "report",
  },
];

type StaffRequest = Awaited<
  ReturnType<typeof getStaffRequest>
>["data"];

export default async function StaffRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId: id } = await params;

  const jobData = (async () => {
    const { error, data: staffRequest } = await getStaffRequest(id);
    if (error || staffRequest == null) notFound();
    const [shiftsRaw, sitePayments] = await Promise.all([
      listShiftsForStaffRequest(id),
      getStaffRequestSiteAndPayments(id),
    ]);
    const shiftsForRequest = await attachResolvedWorkerPhotos(shiftsRaw);
    const billing: StaffRequestSiteAndPayments =
      sitePayments.error || sitePayments.data == null
        ? { location: null, payments: [] }
        : sitePayments.data;
    return { staffRequest, shiftsForRequest, billing };
  })();

  return (
    <div className="w-full max-w-5xl space-y-6">
      <BackLink backHref="/app" title="Staff requests" />

      <SuspendedItem
        item={jobData}
        fallback={<JobDetailSkeleton />}
        result={({ staffRequest, shiftsForRequest, billing }) => (
          <JobDetailContent
            staffRequest={staffRequest}
            requestId={id}
            shiftsForRequest={shiftsForRequest}
            billing={billing}
          />
        )}
      />
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-48" />
    </div>
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

function JobDetailContent({
  staffRequest,
  requestId,
  shiftsForRequest,
  billing,
}: {
  staffRequest: NonNullable<StaffRequest>;
  requestId: string;
  shiftsForRequest: ShiftTableRow[];
  billing: StaffRequestSiteAndPayments;
}) {
  const addressLine = formatSiteAddress(billing.location);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {`Staff request ${staffRequest.id.substring(0, 8)}`}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 font-normal">
            {staffRequest.pricing_tier}
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal">
            <DollarSignIcon className="size-3.5" />
            {formatJobHourlyRateLine(staffRequest.pricing_rate)}
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal">
            <UserIcon className="size-3.5" />
            {`${staffRequest.positions} /shift`}
          </Badge>
        </div>
      </header>

      <div className="rounded-xl border border-border px-4 py-4 text-sm">
        <div className="space-y-4">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3">
            <span className="text-muted-foreground shrink-0 sm:min-w-[5.5rem]">
              Site
            </span>
            <span className="min-w-0">
              {addressLine ?? (
                <span className="text-muted-foreground">Not on file</span>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3">
            <span className="text-muted-foreground shrink-0 sm:min-w-[5.5rem]">
              Billing
            </span>
            <div className="min-w-0">
              {billing.payments.length === 0 ? (
                <p className="text-muted-foreground">No charges recorded yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {billing.payments.map((p) => (
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
                      <span className="text-muted-foreground text-xs">
                        {p.card_display}
                      </span>
                      <span className="text-muted-foreground text-xs capitalize">
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Shifts</h2>
        <p className="text-muted-foreground text-sm">
          Workers and hours booked under this staff request.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <ShiftsTable rows={shiftsForRequest} variant="client-request" />
        </div>
      </div>

      {/* Collapsible Job Details */}
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={
          staffRequest.requirements.length > 0
            ? ["requirements"]
            : staffRequest.tasks.length > 0
              ? ["tasks"]
              : (staffRequest.notes ?? "").trim()
                ? ["notes"]
                : []
        }
      >
        {staffRequest.requirements.length > 0 && (
          <AccordionItem value="requirements">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <ListChecksIcon className="size-4 shrink-0" />
                Requirements
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="mb-2 text-xs text-muted-foreground">
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
        )}

        {staffRequest.tasks.length > 0 && (
          <AccordionItem value="tasks">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 shrink-0" />
                Tasks & Responsibilities
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Day-to-day duties for this position
              </p>
              <ul className="space-y-2">
                {staffRequest.tasks.map((task, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {(staffRequest.notes ?? "").trim() && (
          <AccordionItem value="notes">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              Additional Notes
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {staffRequest.notes}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <Separator />

      {/* Action Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options
            .filter((o): o is typeof o & { href: string } => o.href != null)
            .map((option) => (
            <Link
              className="group block transition-opacity hover:opacity-90"
              href={`/client/requests/${requestId}/${option.href}`}
              key={option.href}
            >
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{option.label}</CardTitle>
                    <CardDescription className="mt-1">
                      {option.description}
                    </CardDescription>
                  </div>
                  <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

