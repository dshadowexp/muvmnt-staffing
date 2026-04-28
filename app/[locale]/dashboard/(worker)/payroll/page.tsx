import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { retrievePayrollAccountAction } from "@/features/payroll/actions";
import {
  getTipsForWorker,
  getTransfersForWorker,
} from "@/features/payroll/dal/queries";
import { CompletePayrollSetupButton } from "@/features/payroll/components/complete-payroll-setup-button";
import { WorkerPayrollBalances } from "@/features/payroll/components/worker-payroll-balances";
import { TipsTable } from "./_tips-table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function PayrollContent() {
  const [{ data, error }, t] = await Promise.all([
    retrievePayrollAccountAction(),
    getTranslations("dashboard.worker.payroll"),
  ]);
  // const hasAccount = !error && data?.accountId;

  // if (hasAccount) {
  //   return <WorkerPayrollBalances />;
  // }

  return (
    <div className="border-border bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
      {/* <p className="text-muted-foreground text-sm">
        {error ? t("loadError") : t("needSetup")}
      </p> */}
      <p className="text-muted-foreground mt-3 text-sm">
        {t("completeTasksFirst")}
      </p>
      {/* <CompletePayrollSetupButton /> */}
    </div>
  );
}

function PayrollSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function TransfersSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border p-4 space-y-3">
      <div className="flex gap-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

async function TipHistory() {
  const tips = await getTipsForWorker();
  return <TipsTable tips={tips} />;
}

export default async function WorkerPayrollPage() {
  const t = await getTranslations("dashboard.worker.payroll");

  return (
    <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <Suspense fallback={<PayrollSkeleton />}>
        <PayrollContent />
      </Suspense>

      {/* <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("tips")}</h2>
        <p className="text-muted-foreground mt-1 mb-4 text-sm">
          {t("tipsSubtitle")}
        </p>
        <Suspense fallback={<TransfersSkeleton />}>
          <TipHistory />
        </Suspense>
      </div> */}
    </div>
  );
}
