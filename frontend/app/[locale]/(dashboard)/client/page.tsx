import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { formatJobHourlyRateLine, formatTime } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STAFF_REQUEST_DISPLAY_TITLE } from "@/features/requests/constants";
import { getJobInfos } from "@/features/requests/dal/queries";
import {
  formatStaffRequestDailyWindowsShort,
  parseStaffRequestDailyWindows,
} from "@/features/requests/lib/parse-staff-request-daily-windows";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientPage() {
  return (
    <div className="w-full max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Your requests
        </h1>
        <Link
          href="/client/requests/new"
          prefetch={true}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          <PlusIcon className="size-4 shrink-0" aria-hidden />
          New request
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="h-full">
                <div className="flex h-full flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <Skeleton className="h-5 w-48 max-w-[70%]" />
                      <Skeleton className="size-4 shrink-0 rounded-sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3 pt-0">
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 pt-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </CardFooter>
                </div>
              </Card>
            ))}
          </div>
        }
      >
        <StaffRequests />
      </Suspense>
    </div>
  );
}

async function StaffRequests() {
  const {
    data: staffRequests,
    error: staffRequestsError,
    message: staffRequestsMessage,
  } = await getJobInfos();
  if (staffRequestsError) {
    return (
      <p className="text-muted-foreground text-sm">{staffRequestsMessage}</p>
    );
  }

  if (staffRequests == null || staffRequests.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        You have no confirmed staff requests yet. Create one with{" "}
        <span className="font-medium text-foreground">New request</span>.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {staffRequests.map((staffRequest) => (
        <Link
          key={staffRequest.id}
          href={`/client/requests/${staffRequest.id}`}
          prefetch={true}
          className="group block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full transition-shadow duration-200 hover:shadow-md">
            <div className="flex h-full flex-col">
              <CardHeader className="pb-2 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-snug md:text-lg">
                      {STAFF_REQUEST_DISPLAY_TITLE}
                    </CardTitle>
                  </div>
                  <ArrowRightIcon
                    className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 pt-0">
                {(staffRequest.notes ?? "").trim() ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {staffRequest.notes}
                  </p>
                ) : null}
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
                    {format(new Date(staffRequest.start_date), "MMM d, yyyy")}
                    {staffRequest.end_date
                      ? ` – ${format(new Date(staffRequest.end_date), "MMM d, yyyy")}`
                      : " (ongoing)"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 shrink-0" aria-hidden />
                    {formatStaffRequestDailyWindowsShort(
                      parseStaffRequestDailyWindows(staffRequest.daily_time_windows),
                      formatTime,
                    )}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2 pb-5 pt-2">
                <Badge variant="secondary" className="font-medium">
                  {formatJobHourlyRateLine(staffRequest.pricing_rate)}
                </Badge>
                <Badge variant="outline" className="gap-1 font-normal">
                  <UserIcon className="size-3" aria-hidden />
                  {staffRequest.positions}{" "}
                  {staffRequest.positions === 1 ? "position" : "positions"}
                </Badge>
              </CardFooter>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
