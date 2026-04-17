import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import {
  countCompletedShiftsForWorker,
  totalEarningsForWorker,
  listShiftsForWorkerOnDay,
} from "@/features/shifts/dal/queries";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import {
  getWorkAuthorization,
  getWorkerProfile,
} from "@/features/profile/dal/queries";
import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
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
  ChevronRightIcon,
  FileTextIcon,
  Loader2Icon,
  ShieldCheckIcon,
  StethoscopeIcon,
  WalletIcon,
} from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

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
          <ShiftsTable rows={todayShifts} variant="worker" />
        </div>
      )}
    </>
  );
}

type PendingAction = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  badge?: { label: string; icon?: ReactNode };
};

async function PendingActions({ userId }: { userId: string }) {
  const [professionInterview, resumeInterview, workAuth, t] = await Promise.all([
    getInterviewBySubjectForUser("profession", userId),
    getInterviewBySubjectForUser("resume", userId),
    getWorkAuthorization(),
    getTranslations("dashboard.worker.home"),
  ]);

  const actions: PendingAction[] = [];

  if (!professionInterview?.completed_at) {
    actions.push({
      id: "profession-interview",
      title: t("professionInterview.title"),
      description: t("professionInterview.description"),
      icon: <StethoscopeIcon className="size-5 text-primary" />,
      href: "/worker/assessments",
    });
  }

  if (!resumeInterview?.completed_at) {
    actions.push({
      id: "resume-interview",
      title: t("resumeInterview.title"),
      description: t("resumeInterview.description"),
      icon: <FileTextIcon className="size-5 text-primary" />,
      href: "/worker/assessments",
    });
  }

  if (workAuth && workAuth.is_verified !== true) {
    actions.push({
      id: "work-authorization",
      title: t("workAuth.title"),
      description: t("workAuth.description"),
      icon: <ShieldCheckIcon className="size-5 text-muted-foreground" />,
      badge: {
        label: t("workAuth.badge"),
        icon: <Loader2Icon className="size-3 animate-spin" />,
      },
    });
  }

  if (actions.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">
        {t("pendingActionsTitle")}
      </h2>
      <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">
        {t("pendingActionsSubtitle")}
      </p>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
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
      className={`h-full w-[280px] shrink-0 snap-start ${
        action.href
          ? "transition-colors hover:border-primary/50 hover:bg-muted/30"
          : ""
      }`}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-muted p-2">{action.icon}</div>
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
          <p className="text-muted-foreground line-clamp-2 text-sm">
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
      <Skeleton className="h-6 w-24" />
      <Skeleton className="mt-2 mb-4 h-4 w-64" />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card size="sm" key={i} className="w-[280px] shrink-0">
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
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const t = await getTranslations("dashboard.worker.home");

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("welcome", { name: worker.first_name })}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards workerId={worker.id} />
      </Suspense>

      <Suspense fallback={<PendingActionsSkeleton />}>
        <PendingActions userId={worker.user_id} />
      </Suspense>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {t("todaysShifts")}
        </h2>
        <Suspense fallback={<ShiftsTableSkeleton />}>
          <TodayShifts workerId={worker.id} />
        </Suspense>
      </div>
    </div>
  );
}
