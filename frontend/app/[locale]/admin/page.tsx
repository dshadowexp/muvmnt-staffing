import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
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
      <p className="text-muted-foreground px-4 text-sm lg:px-6">
        Platform overview — key metrics, activity chart, and records.
      </p>

      <SectionCards
        metrics={{
          users: d.usersCount,
          workers: d.workerCount,
          clients: d.clientCount,
          jobPostings: d.jobCount,
        }}
      />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>

      <Separator className="mx-4 lg:mx-6" />

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <AdminSectionHeader
          title="Recent workers"
          description="Latest registered profiles"
          href="/admin/workers"
        />
        <AdminWorkersTable workers={d.workers.slice(0, 8)} />
      </div>

      <Separator className="mx-4 lg:mx-6" />

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <AdminSectionHeader
          title="Recent clients"
          description="Organizations on the platform"
          href="/admin/clients"
        />
        <AdminClientsTable clients={d.clients.slice(0, 8)} />
      </div>

      <Separator className="mx-4 lg:mx-6" />

      <div className="flex flex-col gap-4 px-4 lg:px-6">
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
