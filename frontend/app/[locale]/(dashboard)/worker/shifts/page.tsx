import { listShiftsForWorker } from "@/features/shifts/dal/queries";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { redirect } from "next/navigation";

export default async function WorkerShiftsPage() {
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const shifts = await listShiftsForWorker(worker.id);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Shifts</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Scheduled and completed shifts tied to your assignments. Rates and
          totals are estimates when the shift uses scheduled times from the staff
          request.
        </p>
      </div>

      <div className="overflow-x-auto">
        <ShiftsTable rows={shifts} variant="worker" />
      </div>
    </div>
  );
}
