import { ShiftsTable } from "@/features/shifts/components/shifts-table";
import { listShiftsForClientUser } from "@/features/shifts/dal/queries";
import { attachResolvedWorkerPhotos } from "@/features/shifts/lib/resolve-worker-photo-url";
import { getSession } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { PlusIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";


export default async function ClientHomePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "client") redirect("/app");

  const shiftsRaw = await listShiftsForClientUser(session.userId);
  const shifts = await attachResolvedWorkerPhotos(shiftsRaw);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Make request</h1>
        <p className="text-muted-foreground mt-1 mb-4 max-w-2xl text-sm">
          Create a new staff request to get started.
        </p>
        <div>
          <Link className="transition-opacity" href="/client/requests/new" prefetch={true}>
            <Card className="h-full flex items-center justify-center border-dashed border-3 bg-transparent hover:border-primary/50 transition-colors shadow-none">
              <div className="text-lg flex items-center gap-2">
                <PlusIcon className="size-6" />
                New staff request
              </div>
            </Card>
          </Link>
        </div>
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Upcoming shifts</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Your upcoming shifts across your staff requests.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <ShiftsTable rows={shifts} variant="client-request" />
        </div>
      </div>
    </div>
  );
}