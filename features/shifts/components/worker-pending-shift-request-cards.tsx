import { format } from "date-fns";
import { CalendarRangeIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { normalizeProfessionId } from "@/lib/professions";
import { listScheduledAssignmentsGroupedByRequestForWorker } from "@/features/shifts/dal/queries";
import { AssignmentResponseTimer } from "./assignment-response-timer";
import { Skeleton } from "@/components/ui/skeleton";

function formatDateRange(startIso: string, endIso: string | null): string {
  const start = format(new Date(startIso), "MMM d, yyyy");
  if (!endIso) return start;
  const end = format(new Date(endIso), "MMM d, yyyy");
  return start === end ? start : `${start} – ${end}`;
}

export function ShiftRequestCardsSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card size="sm" key={i}>
            <CardContent className="space-y-3 p-4">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export async function WorkerPendingShiftRequestCards({
  workerId,
}: {
  workerId: string;
}) {
  const [assignments, t, tProf] = await Promise.all([
    listScheduledAssignmentsGroupedByRequestForWorker(workerId),
    getTranslations("dashboard.worker.home.shiftRequests"),
    getTranslations("professions"),
  ]);

  if (assignments.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          {t("sectionTitle")}
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {assignments.length}
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((a) => {
          const professionLabel = tProf(normalizeProfessionId(a.profession));
          return (
            <Link
              key={a.requestId}
              href={`/dashboard/shifts/requests/${a.requestId}`}
              className="group block rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring hover:opacity-95"
              aria-label={t("openRequestAria", { profession: professionLabel })}
            >
              <Card
                size="sm"
                className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-muted/30"
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{professionLabel}</p>
                    <AssignmentResponseTimer assignedAtIso={a.assignedAt} />
                  </div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <CalendarRangeIcon className="size-3.5 shrink-0" />
                    {formatDateRange(a.startDate, a.endDate)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("shiftCount", { count: a.shiftCount })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
