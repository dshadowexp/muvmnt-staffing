import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import {
  getWorkerAvailabilityInitial,
  type WorkerAvailabilityInitial,
} from "@/features/availability/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { defaultWeekSchedule } from "@/features/availability/lib/week-state";
import { AvailabilitySettingsClient } from "../_client";

export default async function AvailabilityEditPage() {
  const locale = await getLocale();
  const worker = await getWorkerProfile();
  if (!worker) return redirect({ href: "/onboarding/profile", locale });

  // Kick off the availability fetch without awaiting so the client can render
  // the header/Save button immediately and stream the form fields in behind
  // their own Suspense boundary.
  const dataPromise: Promise<WorkerAvailabilityInitial> =
    getWorkerAvailabilityInitial().then(
      (d) =>
        d ?? {
          timezone: "America/Toronto",
          week: defaultWeekSchedule(),
          autoConfirm: false,
        },
    );
  dataPromise.catch(() => undefined);

  return (
    <div className="flex w-full max-w-5xl flex-col">
      <AvailabilitySettingsClient dataPromise={dataPromise} />
    </div>
  );
}
