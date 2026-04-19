import { getTranslations } from "next-intl/server";
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
  const [d, t] = await Promise.all([
    getAdminDashboardSnapshot(),
    getTranslations("dashboard.admin.home"),
  ]);

  return (
    <>
      <p className="text-muted-foreground w-full max-w-6xl text-sm">
        {t("subtitle")}
      </p>

      <div className="w-full max-w-6xl">
        <SectionCards />
      </div>

      <div className="w-full max-w-6xl">
        <ChartAreaInteractive />
      </div>

      <Separator className="w-full max-w-6xl" />

      <div className="flex w-full max-w-6xl flex-col gap-4">
        <AdminSectionHeader
          title={t("recentWorkers")}
          description={t("recentWorkersDescription")}
          href="/admin/workers"
        />
        <AdminWorkersTable workers={d.workers.slice(0, 8)} />
      </div>

      <Separator className="w-full max-w-6xl" />

      <div className="flex w-full max-w-6xl flex-col gap-4">
        <AdminSectionHeader
          title={t("recentClients")}
          description={t("recentClientsDescription")}
          href="/admin/clients"
        />
        <AdminClientsTable clients={d.clients.slice(0, 8)} />
      </div>

      <Separator className="w-full max-w-6xl" />

      <div className="flex w-full max-w-6xl flex-col gap-4">
        <AdminSectionHeader
          title={t("recentJobs")}
          description={t("recentJobsDescription")}
          href="/admin/jobs"
        />
        <AdminJobsTable jobs={d.jobs.slice(0, 8)} />
      </div>
    </>
  );
}
