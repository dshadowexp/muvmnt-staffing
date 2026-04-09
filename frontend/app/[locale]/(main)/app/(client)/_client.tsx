import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { formatJobHourlyRateLine, formatTime } from "@/lib/formatters";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getJobInfos } from "@/features/requests/dal/queries";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientAppPage() {
  return (
    <>
      <div className="container my-4 max-w-5xl">
        <div className="flex gap-2 justify-between mb-6">
          <h2 className="text-xl md:text-2xl lg:text-3xl">
            Your requests
          </h2>
        </div>
        <Link className="transition-opacity" href="/app/requests/new" prefetch={true}>
          <Card className="h-full flex items-center justify-center border-dashed border-3 bg-transparent hover:border-primary/50 transition-colors shadow-none">
            <div className="text-lg flex items-center gap-2">
              <PlusIcon className="size-6" />
              New request
            </div>
          </Card>
        </Link>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-6 pt-6">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="h-full">
                  <div className="flex h-full flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <Skeleton className="h-6 w-48 max-w-[70%]" />
                        <Skeleton className="size-5 shrink-0 rounded-sm" />
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2 pt-6">
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
    </>
  );
}

async function StaffRequests() {
  const { data: staffRequests, error: staffRequestsError, message: staffRequestsMessage } = await getJobInfos();
  if (staffRequestsError) return <div>{staffRequestsMessage}</div>;

  if (staffRequests == null || staffRequests.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 pt-6 has-hover:*:not-hover:opacity-70">
        
      {staffRequests.map((staffRequest) => (
        <Link
          className="hover:scale-[1.02] transition-[transform_opacity]"
          href={`/app/requests/${staffRequest.id}`}
          key={staffRequest.id}
        >
          <Card className="h-full transition-transform group-hover:shadow-md">
            <div className="flex h-full flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg leading-tight">
                      {staffRequest.profession}
                    </CardTitle>
                  </div>
                  <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {(staffRequest.notes ?? "").trim() ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {staffRequest.notes ?? "No notes"}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="size-4 shrink-0" />
                    {format(new Date(staffRequest.start_date), "MMM d, yyyy")}
                    {staffRequest.end_date
                      ? ` – ${format(new Date(staffRequest.end_date), "MMM d, yyyy")}`
                      : " (ongoing)"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="size-4 shrink-0" />
                    {formatTime(staffRequest.start_time)} – {formatTime(staffRequest.end_time)}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2 pt-6">
                <Badge variant="secondary" className="font-semibold">
                  {formatJobHourlyRateLine(staffRequest.hourly_rate)}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <UserIcon className="size-3" />
                  {staffRequest.positions} {staffRequest.positions === 1 ? "position" : "positions"}
                </Badge>
              </CardFooter>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}