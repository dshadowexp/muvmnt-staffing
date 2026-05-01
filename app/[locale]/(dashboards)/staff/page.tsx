import { Suspense, type ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import {
  countCompletedShiftsForWorker,
  totalEarningsForWorker,
  listShiftsForWorkerOnDay,
} from "@/features/shifts/dal/queries";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import {
  getWorkerProfile,
} from "@/features/profile/dal/queries";
import {
  getWorkerPendingActions,
  type WorkerPendingAction,
} from "@/features/staff/dal/queries";
import { ShiftRequestCardsSkeleton, WorkerPendingShiftRequestCards } from "@/features/shifts/components/worker-pending-shift-request-cards";
import { redirect } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2Icon,
  StethoscopeIcon,
  WalletIcon,
  ShieldCheckIcon,
  FingerprintIcon,
  CircleDashedIcon,
  ChevronRightIcon,
  MapPinIcon,
  CalendarClockIcon,
} from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { Link } from "@/i18n/navigation";
import { WorkerStageStrip } from "@/features/staff/components/worker-stage-strip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LockedShiftSection } from "./_locked-shift-section";

function formatCents(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

async function StatsCards({ workerId }: { workerId: string }) {
  const [completedCount, earnings, t] = await Promise.all([
    countCompletedShiftsForWorker(workerId),
    totalEarningsForWorker(workerId),
    getTranslations("dashboard.worker.home"),
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
          <p className="text-2xl font-semibold">{completedCount}</p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <WalletIcon className="size-4" />
            {t("totalEarned")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {formatCents(earnings.amountCents, earnings.currency)}
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

async function TodayShifts({ workerId }: { workerId: string }) {
  const t = await getTranslations("dashboard.worker.home");
  const now = toZonedTime(new Date(), SHIFT_SCHEDULE_TIMEZONE);
  const dayStart = fromZonedTime(startOfDay(now), SHIFT_SCHEDULE_TIMEZONE).toISOString();
  const dayEnd = fromZonedTime(endOfDay(now), SHIFT_SCHEDULE_TIMEZONE).toISOString();

  const todayShifts = await listShiftsForWorkerOnDay(workerId, dayStart, dayEnd);

  return (
    <>
      <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">
        {todayShifts.length === 0
          ? t("noShifts")
          : t("shiftsToday", { count: todayShifts.length })}
      </p>
      {todayShifts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <ShiftsTable rows={todayShifts} variant="staff" />
        </div>
      )}
    </>
  );
}

/** UI-enriched version of WorkerPendingAction — adds JSX fields for rendering. */
export type PendingAction = WorkerPendingAction & {
  title: string;
  description: string;
  icon?: ReactNode;
  badge?: { label: string; icon?: ReactNode };
};

async function PendingActions() {
  const t = await getTranslations("dashboard.worker.home");
  const pending = await getWorkerPendingActions();

  if (pending.length === 0) return null;

  /** Map each DAL action id → UI-layer icon + i18n strings. */
  const iconMap: Record<string, { title: string; description: string; icon: ReactNode }> = {
    "assessment-interview": {
      title:       t("assessmentInterview.title"),
      description: t("assessmentInterview.description"),
      icon:        <StethoscopeIcon className="size-5 text-primary" />,
    },
    "work-authorization": {
      title:       t("workAuthorization.title"),
      description: t("workAuthorization.description"),
      icon:        <ShieldCheckIcon className="size-5 text-primary" />,
    },
    "identity-verification": {
      title:       t("identityVerification.title"),
      description: t("identityVerification.description"),
      icon:        <FingerprintIcon className="size-5 text-primary" />,
    },
    "payroll-onboarding": {
      title:       t("payrollOnboarding.title"),
      description: t("payrollOnboarding.description"),
      icon:        <WalletIcon className="size-5 text-primary" />,
    },
    "setup-location": {
      title:       t("setupLocation.title"),
      description: t("setupLocation.description"),
      icon:        <MapPinIcon className="size-5 text-primary" />,
    },
    "setup-availability": {
      title:       t("setupAvailability.title"),
      description: t("setupAvailability.description"),
      icon:        <CalendarClockIcon className="size-5 text-primary" />,
    },
    "processing": {
      title:       t("processing.title"),
      description: t("processing.description"),
      icon:        <CircleDashedIcon className="size-5 text-primary animate-spin" />,
    },
  };

  const actions: PendingAction[] = pending.map((a) => ({
    ...a,
    ...(iconMap[a.id] ?? {
      title:       t("processing.title"),
      description: t("processing.description"),
      icon:        <CircleDashedIcon className="size-5 animate-spin text-primary" />,
    }),
  }));

  if (actions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm text-muted-foreground font-semibold tracking-tight">
          {t("importantTasksTitle")}
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {actions.length}
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <PendingActionCard key={a.id} action={a} />
        ))}
      </div>
    </div>
  );
}

function PendingActionCard({ action }: { action: PendingAction }) {
  const card = (
    <Card
      size="sm"
      className={`h-full ${
        action.href
          ? "transition-colors hover:border-primary/50 hover:bg-muted/30"
          : ""
      }`}
    >
      <CardContent className="flex items-start gap-3 p-4">
        {action.icon ? (
          <div className="rounded-md bg-muted p-2">{action.icon}</div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{action.title}</p>
            {action.badge ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                {action.badge.icon}
                {action.badge.label}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {action.description}
          </p>
        </div>
        {action.href ? (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : null}
      </CardContent>
    </Card>
  );

  if (action.href) {
    return (
      <Link
        href={action.href}
        aria-label={action.title}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {card}
      </Link>
    );
  }
  return (
    <div aria-disabled className="pointer-events-none">
      {card}
    </div>
  );
}


function PendingActionsSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 mb-4 h-4 w-64" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card size="sm" key={i}>
            <CardContent className="flex items-start gap-3 p-4">
              <Skeleton className="size-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ShiftsTableSkeleton() {
  return (
    <>
      <Skeleton className="mt-1 mb-4 h-4 w-56" />
      <div className="overflow-x-auto rounded-xl border border-border p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

export default async function WorkerHomePage() {
  const locale = await getLocale();
  const worker = await getWorkerProfile();
  if (!worker) {
    return redirect({ href: "/onboarding", locale })
  };

  const t = await getTranslations("dashboard.worker.home");

  const notLive = worker.stage !== "live";
  const isLive = worker.stage === "live";

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("welcome", { name: worker.first_name })}
        </h1>
      </div>

      <WorkerStageStrip stage={worker.stage} />

      {notLive && (
        <Alert className="border-primary/25 bg-primary/[0.04]">
          <AlertTitle>{t("notLiveTitle")}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {t("notLiveDescription")}
          </AlertDescription>
        </Alert>
      )}

      <Suspense fallback={<PendingActionsSkeleton />}>
        <PendingActions />
      </Suspense>

      {isLive ? (
        <Suspense fallback={<ShiftRequestCardsSkeleton />}>
          <WorkerPendingShiftRequestCards workerId={worker.id} />
        </Suspense>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
              {t("shiftRequests.sectionTitle")}
            </h2>
          </div>
          <LockedShiftSection description={t("shiftsLockedDescription")} />
        </div>
      )}

      {isLive ? (
        <Suspense fallback={<StatsCardsSkeleton />}>
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {t("subtitle")}
            </p>
            <StatsCards workerId={worker.id} />
          </div>
        </Suspense>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{t("subtitle")}</p>
          <LockedShiftSection description={t("shiftsLockedDescription")} />
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("todaysShifts")}</h2>
        {isLive ? (
          <Suspense fallback={<ShiftsTableSkeleton />}>
            <TodayShifts workerId={worker.id} />
          </Suspense>
        ) : (
          <div className="mt-4">
            <LockedShiftSection description={t("shiftsLockedDescription")} />
          </div>
        )}
      </div>
    </div>
  );
}
