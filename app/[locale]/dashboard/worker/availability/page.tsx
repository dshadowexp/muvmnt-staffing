import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getWorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { defaultWeekSchedule } from "@/features/availability/lib/week-state";
import {
  AvailabilitySummaryCard,
  AvailabilitySummaryCardSkeleton,
} from "./_summary";

async function SummarySection() {
  const data = await getWorkerAvailabilityInitial();
  const initial = data ?? {
    timezone: "America/Toronto",
    week: defaultWeekSchedule(),
    autoConfirm: false,
  };
  return <AvailabilitySummaryCard data={initial} />;
}

export default async function AvailabilityPage() {
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const t = await getTranslations("dashboard.worker.availability");

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </header>
      <Suspense fallback={<AvailabilitySummaryCardSkeleton />}>
        <SummarySection />
      </Suspense>
    </div>
  );
}
