import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listShiftsForWorker } from "@/features/shifts/dal/queries";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

async function WorkerShiftsTableContent({ workerId }: { workerId: string }) {
  const shifts = await listShiftsForWorker(workerId);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <ShiftsTable rows={shifts} variant="worker" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border p-4 space-y-3">
      <div className="flex gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default async function WorkerShiftsPage() {
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const t = await getTranslations("dashboard.worker.shifts");

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <WorkerShiftsTableContent workerId={worker.id} />
      </Suspense>
    </div>
  );
}
