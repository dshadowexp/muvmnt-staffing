import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { format, isSameDay } from "date-fns";
import { formatJobHourlyRateLine } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStaffRequests } from "@/features/requests/dal/queries";
import {
  ArrowRightIcon,
  CalendarIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default async function RequestsPage() {
  const t = await getTranslations("dashboard.client.requests");
  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
        <Link
          href="/client/requests/new"
          prefetch={true}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          <PlusIcon className="size-4 shrink-0" aria-hidden />
          {t("newRequest")}
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

function formatStaffRequestDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const startLabel = format(start, "MMM d, yyyy");
  if (endDate == null || endDate === "") {
    return `${startLabel}`;
  }
  const end = new Date(endDate);
  if (isSameDay(start, end)) {
    return startLabel;
  }
  return `${startLabel} – ${format(end, "MMM d, yyyy")}`;
}

async function StaffRequests() {
  const [requests, t] = await Promise.all([
    getStaffRequests(),
    getTranslations("dashboard.client.requests"),
  ]);
  const {
    data: staffRequests,
    error: staffRequestsError,
    message: staffRequestsMessage,
  } = requests;
  if (staffRequestsError) {
    return (
      <p className="text-muted-foreground text-sm">{staffRequestsMessage}</p>
    );
  }

  if (staffRequests == null || staffRequests.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("emptyPrefix")}{" "}
        <span className="font-medium text-foreground">{t("emptyAction")}</span>
        {t("emptySuffix")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 has-hover:*:not-hover:opacity-70">
      {staffRequests.map((staffRequest) => (
        <Link
          key={staffRequest.id}
          href={`/client/requests/${staffRequest.id}`}
          prefetch={true}
          className="group block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring hover:scale-[1.02] transition-[transform_opacity]"
        >
          <Card className="h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-4 h-full">
                  <CardHeader>
                    <CardTitle className="text-md">
                      {t("staffRequestId", { id: staffRequest.id.substring(0, 8) })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
                    {formatStaffRequestDateRange(
                      staffRequest.start_date,
                      staffRequest.end_date,
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Badge variant="outline" className="gap-1 font-normal">
                      {staffRequest.pricing_tier}
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal">
                      {`CAD ${formatJobHourlyRateLine(staffRequest.pricing_rate)}`}
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal">
                      <UserIcon className="size-3" aria-hidden />
                      {staffRequest.positions}
                    </Badge>
                  </CardFooter>
                </div>
                <CardContent>
                  <ArrowRightIcon className="size-6" />
                </CardContent>
              </div>
            </Card>
        </Link>
      ))}
    </div>
  );
}
