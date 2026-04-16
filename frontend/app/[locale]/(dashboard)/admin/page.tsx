import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/app/[locale]/(dashboard)/_components/section-cards";
import { Separator } from "@/components/ui/separator";
import {
  AdminClientsTable,
  AdminJobsTable,
  AdminSectionHeader,
  AdminWorkersTable,
} from "@/features/admin/components/admin-data-tables";
import { getAdminDashboardSnapshot } from "@/features/admin/dal/queries";

export default async function AdminDashboardPage() {
  const d = await getAdminDashboardSnapshot();

  return (
    <>
      <p className="text-muted-foreground w-full max-w-6xl text-sm">
        Platform overview — key metrics, activity chart, and records.
      </p>

      <div className="w-full max-w-6xl">
        <SectionCards
          // metrics={{
          //   users: d.usersCount,
          //   workers: d.workerCount,
          //   clients: d.clientCount,
          //   jobPostings: d.jobCount,
          // }}
        />
      </div>

      <div className="w-full max-w-6xl">
        <ChartAreaInteractive />
      </div>

      <Separator className="w-full max-w-6xl" />

      <div className="flex w-full max-w-6xl flex-col gap-4">
        <AdminSectionHeader
          title="Recent workers"
          description="Latest registered profiles"
          href="/admin/workers"
        />
        <AdminWorkersTable workers={d.workers.slice(0, 8)} />
      </div>

      <Separator className="w-full max-w-6xl" />

      <div className="flex w-full max-w-6xl flex-col gap-4">
        <AdminSectionHeader
          title="Recent clients"
          description="Organizations on the platform"
          href="/admin/clients"
        />
        <AdminClientsTable clients={d.clients.slice(0, 8)} />
      </div>

      <Separator className="w-full max-w-6xl" />

      <div className="flex w-full max-w-6xl flex-col gap-4">
        <AdminSectionHeader
          title="Recent job postings"
          description="Staff requests from clients"
          href="/admin/jobs"
        />
        <AdminJobsTable jobs={d.jobs.slice(0, 8)} />
      </div>
    </>
  );
}
