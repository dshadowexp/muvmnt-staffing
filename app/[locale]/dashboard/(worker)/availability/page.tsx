import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getWorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { defaultWeekSchedule } from "@/features/availability/lib/week-state";
import { SectionCardSkeleton } from "@/features/profile/components/worker-account-profile";
import {
  AvailabilitySummaryCard,
  AvailabilitySummaryCardSkeleton,
} from "./_summary";
import { WorkerAvailabilityAddressCard } from "./_address-card";

async function SummarySection({ locked }: { locked: boolean }) {
  const data = await getWorkerAvailabilityInitial();
  const initial = data ?? {
    timezone: "America/Toronto",
    week: defaultWeekSchedule(),
    autoConfirm: false,
  };
  return <AvailabilitySummaryCard data={initial} locked={locked} />;
}

export default async function AvailabilityPage() {
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const stage = worker.stage ?? null;
  const locked = !stage || stage === "picture" || stage === "interview" || stage === "compliance";

  const t = await getTranslations("dashboard.worker.availability");

  const locationPromise = getAddressLocation().then((l) => l ?? null);
  locationPromise.catch(() => undefined);

  return (
    <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </header>
      <Suspense fallback={<AvailabilitySummaryCardSkeleton />}>
        <SummarySection locked={locked} />
      </Suspense>
      <Suspense fallback={<SectionCardSkeleton lines={2} />}>
        <WorkerAvailabilityAddressCard locationPromise={locationPromise} locked={locked} />
      </Suspense>
    </div>
  );
}
