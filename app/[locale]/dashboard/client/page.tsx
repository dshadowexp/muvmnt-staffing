import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import {
  completedShiftStatsForClient,
  listTodayShiftsForClientUser,
} from "@/features/shifts/dal/queries";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import { attachResolvedWorkerPhotos } from "@/features/shifts/lib/resolve-worker-photo-url";
import { getSession } from "@/lib/session";
import { getClientProfile } from "@/features/profile/dal/queries";
import { Link } from "@/i18n/navigation";
import { CheckCircle2Icon, ClockIcon, PlusIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

async function StatsCards({ userId }: { userId: string }) {
  const [stats, t] = await Promise.all([
    completedShiftStatsForClient(userId),
    getTranslations("dashboard.client.home"),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2Icon className="size-4" />
            {t("shiftsCompleted")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.count}</p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClockIcon className="size-4" />
            {t("totalTimeCovered")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {stats.totalMinutes > 0 ? formatDuration(stats.totalMinutes) : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card size="sm" key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function TodayShifts({ userId }: { userId: string }) {
  const t = await getTranslations("dashboard.client.home");
  const now = toZonedTime(new Date(), SHIFT_SCHEDULE_TIMEZONE);
  const dayStart = fromZonedTime(startOfDay(now), SHIFT_SCHEDULE_TIMEZONE).toISOString();
  const dayEnd = fromZonedTime(endOfDay(now), SHIFT_SCHEDULE_TIMEZONE).toISOString();

  const shiftsRaw = await listTodayShiftsForClientUser(userId, dayStart, dayEnd);
  const shifts = await attachResolvedWorkerPhotos(shiftsRaw);

  return (
    <>
      <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">
        {shifts.length === 0
          ? t("noShifts")
          : t("shiftsToday", { count: shifts.length })}
      </p>
      {shifts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <ShiftsTable rows={shifts} variant="client-request" />
        </div>
      )}
    </>
  );
}

function ShiftsTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border p-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default async function ClientHomePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "client") redirect(`/${session.role}`);

  const [client, t] = await Promise.all([
    getClientProfile(),
    getTranslations("dashboard.client.home"),
  ]);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {client?.name
            ? t("welcomeWithName", { name: client.name })
            : t("welcome")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards userId={session.userId} />
      </Suspense>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("makeRequest")}
        </h1>
        <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">
          {t("makeRequestSubtitle")}
        </p>
        <div>
          <Link className="transition-opacity" href="/client/requests/new" prefetch={true}>
            <Card className="h-full flex items-center justify-center border-dashed border-3 bg-transparent hover:border-primary/50 transition-colors shadow-none">
              <div className="text-lg flex items-center gap-2">
                <PlusIcon className="size-6" />
                {t("newStaffRequest")}
              </div>
            </Card>
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("todaysShifts")}
        </h1>
        <Suspense fallback={<ShiftsTableSkeleton />}>
          <TodayShifts userId={session.userId} />
        </Suspense>
      </div>
    </div>
  );
}
