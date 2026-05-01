import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { format, isSameDay } from "date-fns";
import {
  ArrowRightIcon,
  CalendarIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STAFF_REQUEST_STATUS_CONFIRMED,
  clientStaffRequestHref,
} from "@/features/requests/constants";
import { getStaffRequests } from "@/features/requests/dal/queries";
import { formatJobHourlyRateLine } from "@/lib/formatters";
import { normalizeProfessionId } from "@/lib/professions";

export default async function RequestsPage() {
  const t = await getTranslations("dashboard.client.requests");
  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
        <Link
          href="/app/requests/new"
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
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
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

function formatStaffRequestDateRange(
  startDate: string,
  endDate: string | null,
): string {
  const start = new Date(startDate);
  const startLabel = format(start, "MMM d, yyyy");
  if (endDate == null || endDate === "") {
    return startLabel;
  }
  const end = new Date(endDate);
  if (isSameDay(start, end)) {
    return startLabel;
  }
  return `${startLabel} – ${format(end, "MMM d, yyyy")}`;
}

async function StaffRequests() {
  const [requests, t, tProf, tHome] = await Promise.all([
    getStaffRequests(),
    getTranslations("dashboard.client.requests"),
    getTranslations("professions"),
    getTranslations("dashboard.client.home"),
  ]);

  if (requests.error) {
    return (
      <p className="text-muted-foreground text-sm">{requests.message}</p>
    );
  }

  const staffRequests = requests.data;
  if (staffRequests == null || staffRequests.length === 0) {
    return (
      <Link
        className="transition-opacity block"
        href="/app/requests/new"
        prefetch={true}
      >
        <Card className="flex h-full min-h-[8.5rem] items-center justify-center border-dashed border-3 bg-transparent shadow-none transition-colors hover:border-primary/50">
          <div className="text-lg flex items-center gap-2">
            <PlusIcon className="size-6 shrink-0" aria-hidden />
            {tHome("newStaffRequest")}
          </div>
        </Card>
      </Link>
    );
  }

  const sorted = [...staffRequests].sort((a, b) => {
    const aDone = a.status === STAFF_REQUEST_STATUS_CONFIRMED ? 1 : 0;
    const bDone = b.status === STAFF_REQUEST_STATUS_CONFIRMED ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return (
    <div className="grid grid-cols-1 gap-4 has-hover:*:not-hover:opacity-70">
      {sorted.map((staffRequest) => {
        const href = clientStaffRequestHref(staffRequest);
        const professionLabel = tProf(normalizeProfessionId(staffRequest.profession));
        return (
          <Link
            key={staffRequest.id}
            href={href}
            prefetch={true}
            className="hover:scale-[1.02] transition-[transform_opacity]"
          >
            <Card className="h-full">
              <div className="flex h-full items-center justify-between">
                <div className="space-y-4 h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {t("staffRequestId", {
                        id: staffRequest.id.substring(0, 8),
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground gap-y-2 text-sm">
                    <p className="text-muted-foreground font-medium">
                      {professionLabel}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1.5 pt-2">
                      <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
                      {formatStaffRequestDateRange(
                        staffRequest.start_date,
                        staffRequest.end_date,
                      )}
                    </p>
                  </CardContent>
                  <CardFooter>
                    {staffRequest.status === STAFF_REQUEST_STATUS_CONFIRMED && staffRequest.pricing_tier ? (
                      <Badge variant="outline" className="gap-1 font-normal">
                        {staffRequest.pricing_tier}
                      </Badge>
                    ) : null}
                    {staffRequest.status === STAFF_REQUEST_STATUS_CONFIRMED && staffRequest.pricing_tier ? (
                      <Badge variant="outline" className="gap-1 font-normal">
                        {formatJobHourlyRateLine(staffRequest.pricing_rate)}
                      </Badge>
                    ) : null}
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
        );
      })}
    </div>
  );
}
