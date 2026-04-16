import { defaultWeekSchedule } from "@/features/availability/lib/week-state";
import { getWorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { redirect } from "next/navigation";
import { AvailabilitySettingsClient } from "./_client";

export default async function AvailabilityPage() {
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const data = await getWorkerAvailabilityInitial();
  const initial =
    data ?? {
      timezone: "America/Toronto",
      week: defaultWeekSchedule(),
    };

  return (
    <div className="flex w-full max-w-5xl flex-col">
      <AvailabilitySettingsClient initial={initial} />
    </div>
  );
}
