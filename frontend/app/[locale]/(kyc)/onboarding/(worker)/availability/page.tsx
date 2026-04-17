import { defaultWeekSchedule } from "@/features/availability/lib/week-state";
import { getWorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import { AvailabilityOnboardingClient } from "./_client";

export default async function WorkerAvailabilityPage() {
  const data = await getWorkerAvailabilityInitial();

  return (
    <AvailabilityOnboardingClient
      initial={
        data ?? {
          timezone: "America/Toronto",
          week: defaultWeekSchedule(),
          autoConfirm: false,
        }
      }
    />
  );
}
