import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import {
  listTodayShiftsForClientUser,
} from "@/features/shifts/dal/queries";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import { attachResolvedWorkerPhotos } from "@/features/shifts/lib/resolve-worker-photo-url";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import { Link, redirect } from "@/i18n/navigation";
import {
  FingerprintIcon,
  UserRoundSearchIcon,
  ClipboardListIcon,
  UsersIcon,
  MailIcon,
  LayoutGridIcon,
} from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionCheckoutTracker } from "@/features/billing/components/subscription-checkout-tracker";
import {
  getFacilityScreeningOverviewStats,
  getScreeningsForFacility,
} from "@/features/screenings/dal/queries";
import { ScreeningHomeCardMenu } from "./_components/screening-home-card-menu";

function ScreeningStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-600">
        Active
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-600">
        Paused
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Closed
    </Badge>
  );
}

async function ScreeningDashboardSection() {
  const facility = await getFacilityProfile();
  const t = await getTranslations("dashboard.client.home");
  if (!facility) return null;

  const [stats, screenings] = await Promise.all([
    getFacilityScreeningOverviewStats(facility.id),
    getScreeningsForFacility(facility.id),
  ]);

  const statItems = [
    {
      icon: ClipboardListIcon,
      label: t("statScreenings"),
      value: stats.screeningCount,
    },
    {
      icon: UsersIcon,
      label: t("statActiveCandidates"),
      value: stats.activeCandidatesCount,
    },
    {
      icon: MailIcon,
      label: t("statPendingInvites"),
      value: stats.pendingInvitesCount,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{t("subtitle")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statItems.map(({ icon: Icon, label, value }) => (
            <Card key={label} size="sm">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 shrink-0" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <LayoutGridIcon className="text-muted-foreground size-5" aria-hidden />
            {t("screeningsHeading")}
          </h2>
          {screenings.length > 0 && (
            <Link
              href="/app/screenings"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              {t("viewAllScreenings")}
            </Link>
          )}
        </div>

        {screenings.length === 0 ? (
          <Link href="/app/screenings/new">
            <Card className="flex min-h-[10rem] items-center justify-center border-dashed border-3 bg-transparent shadow-none transition-colors hover:border-primary/50">
              <p className="text-muted-foreground flex items-center gap-2 text-center text-sm">
                <FingerprintIcon className="size-5 shrink-0" aria-hidden />
                {t("emptyScreenings")}
              </p>
            </Card>
          </Link>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {screenings.map((s) => (
              <Card key={s.id} className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                  <Link
                    href={`/app/screenings/${s.id}`}
                    className="hover:text-primary min-w-0 flex-1 transition-colors"
                  >
                    <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
                  </Link>
                  <ScreeningHomeCardMenu screeningId={s.id} />
                </CardHeader>
                <Link href={`/app/screenings/${s.id}`} className="flex flex-1 flex-col">
                  <CardContent className="text-muted-foreground line-clamp-3 pt-0 text-sm">
                    {s.description}
                  </CardContent>
                  <CardFooter className="mt-auto flex flex-wrap gap-2 pt-4">
                    <ScreeningStatusBadge status={s.status} />
                    <Badge variant="outline" className="text-muted-foreground">
                      {s.allowed_languages.join(", ")}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      {s.interview_duration} min
                    </Badge>
                  </CardFooter>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ScreeningDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card size="sm" key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="flex flex-row justify-between pb-2">
              <Skeleton className="h-5 w-3/5 max-w-[14rem]" />
              <Skeleton className="size-8 shrink-0 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
            <CardFooter className="gap-2 pt-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function TodayShifts() {
  const t = await getTranslations("dashboard.client.home");
  const now = toZonedTime(new Date(), SHIFT_SCHEDULE_TIMEZONE);
  const dayStart = fromZonedTime(startOfDay(now), SHIFT_SCHEDULE_TIMEZONE).toISOString();
  const dayEnd = fromZonedTime(endOfDay(now), SHIFT_SCHEDULE_TIMEZONE).toISOString();

  const shiftsRaw = await listTodayShiftsForClientUser(dayStart, dayEnd);
  const shifts = await attachResolvedWorkerPhotos(shiftsRaw);

  if (shifts.length === 0) return null;

  return (
    <>
      <h2 className="text-lg font-semibold tracking-tight">{t("todaysShifts")}</h2>
      <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">
        {t("shiftsToday", { count: shifts.length })}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <ShiftsTable rows={shifts} variant="client-request" />
      </div>
    </>
  );
}

function ShiftsTableSkeleton() {
  return (
    <div className="border-border space-y-3 overflow-x-auto rounded-xl border p-4">
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
  const locale = await getLocale();
  const [facility, t] = await Promise.all([
    getFacilityProfile(),
    getTranslations("dashboard.client.home"),
  ]);

  if (!facility) {
    return redirect({ href: "/onboarding", locale });
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <Suspense fallback={null}>
        <SubscriptionCheckoutTracker />
      </Suspense>

      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {facility?.name ? t("welcomeWithName", { name: facility.name }) : t("welcome")}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link className="transition-opacity" href="/app/requests/new" prefetch={true}>
          <Card className="border-3 flex h-full min-h-[5.5rem] items-center justify-center border-dashed bg-transparent shadow-none transition-colors hover:border-primary/50">
            <div className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium">
              <UserRoundSearchIcon className="size-5 shrink-0" />
              {t("newStaffRequest")}
            </div>
          </Card>
        </Link>
        <Link className="transition-opacity" href="/app/screenings/new" prefetch={true}>
          <Card className="border-3 flex h-full min-h-[5.5rem] items-center justify-center border-dashed bg-transparent shadow-none transition-colors hover:border-primary/50">
            <div className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium">
              <FingerprintIcon className="size-5 shrink-0" />
              {t("newScreening")}
            </div>
          </Card>
        </Link>
      </div>

      <Suspense fallback={<ScreeningDashboardSkeleton />}>
        <ScreeningDashboardSection />
      </Suspense>

      <div>
        <Suspense fallback={<ShiftsTableSkeleton />}>
          <TodayShifts />
        </Suspense>
      </div>
    </div>
  );
}
