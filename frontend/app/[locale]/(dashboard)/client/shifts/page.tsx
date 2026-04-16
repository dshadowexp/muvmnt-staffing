import { listShiftsForClientUser } from "@/features/shifts/dal/queries";
import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ShiftsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "client") redirect("/app");

  const shifts = await listShiftsForClientUser(session.userId);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Shifts</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Shifts across your staff requests, with worker and scheduling details.
          Open a request to manage a specific posting. Pay estimates use shift
          times when available.
        </p>
      </div>

      <div className="overflow-x-auto">
        <ShiftsTable rows={shifts} variant="client-all" />
      </div>
    </div>
  );
}
