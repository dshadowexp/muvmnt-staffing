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
import { STAFF_REQUEST_DISPLAY_TITLE } from "@/features/requests/constants";
import { getStaffRequest } from "@/features/requests/dal/queries";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { listShiftsForStaffRequest } from "@/features/shifts/dal/queries";
import { formatJobHourlyRateLine, formatTime } from "@/lib/formatters";
import {
  parseStaffRequestDailyWindows,
  type StaffRequestDayPlanJson,
} from "@/features/requests/lib/parse-staff-request-daily-windows";
import { format, parseISO } from "date-fns";
import {
  ArrowRightIcon,
  CalendarIcon,
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
    const shiftsForRequest = await listShiftsForStaffRequest(id);
    return { staffRequest, shiftsForRequest };
  })();

  return (
    <div className="w-full max-w-5xl space-y-6">
      <BackLink backHref="/app" title="Staff requests" />

      <SuspendedItem
        item={jobData}
        fallback={<JobDetailSkeleton />}
        result={({ staffRequest, shiftsForRequest }) => (
          <JobDetailContent
            staffRequest={staffRequest}
            requestId={id}
            shiftsForRequest={shiftsForRequest}
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

function JobDetailContent({
  staffRequest,
  requestId,
  shiftsForRequest,
}: {
  staffRequest: NonNullable<StaffRequest>;
  requestId: string;
  shiftsForRequest: Awaited<ReturnType<typeof listShiftsForStaffRequest>>;
}) {
  const dailyWindows = parseStaffRequestDailyWindows(staffRequest.daily_time_windows);

  function slotsKey(plan: StaffRequestDayPlanJson): string {
    return JSON.stringify(plan.slots.map((s) => [s.startTime, s.endTime]));
  }

  const uniformDailyTime =
    dailyWindows.length > 0 &&
    dailyWindows.every((w) => slotsKey(w) === slotsKey(dailyWindows[0]!));

  function formatDaySlots(plan: StaffRequestDayPlanJson) {
    return plan.slots
      .map((s) => `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`)
      .join("; ");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {STAFF_REQUEST_DISPLAY_TITLE}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-semibold">
            <DollarSignIcon className="size-3.5" />
            {formatJobHourlyRateLine(staffRequest.pricing_rate)}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <UserIcon className="size-3.5" />
            {staffRequest.positions}{" "}
            {staffRequest.positions === 1 ? "position" : "positions"}
          </Badge>
        </div>
      </header>

      {/* Collapsible Job Details */}
      <Accordion type="multiple" className="w-full" defaultValue={["schedule", "requirements"]}>
        <AccordionItem value="schedule">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0" />
              Schedule
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Dates:</span>
                <span>
                  {format(new Date(staffRequest.start_date), "MMM d, yyyy")}
                  {staffRequest.end_date
                    ? ` – ${format(new Date(staffRequest.end_date), "MMM d, yyyy")}`
                    : " (ongoing)"}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-muted-foreground shrink-0">Times:</span>
                <div className="min-w-0 space-y-1">
                  {dailyWindows.length === 0 ? (
                    <span>—</span>
                  ) : uniformDailyTime ? (
                    <span>{formatDaySlots(dailyWindows[0]!)}</span>
                  ) : (
                    <ul className="list-disc space-y-0.5 pl-4">
                      {dailyWindows.map((w) => (
                        <li key={w.date}>
                          {format(parseISO(`${w.date}T12:00:00`), "MMM d")}:{" "}
                          {formatDaySlots(w)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

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
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Shifts</h2>
        <p className="text-muted-foreground text-sm">
          Workers and hours booked under this staff request.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <ShiftsTable rows={shiftsForRequest} variant="client-request" />
        </div>
      </div>

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

