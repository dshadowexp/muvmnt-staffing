import { AdminJobsTable } from "@/features/admin/components/admin-data-tables";
import { getAdminJobsList } from "@/features/admin/dal/queries";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.admin.meta" });
  return { title: t("jobs") };
}

export default async function AdminJobsPage() {
  const jobs = await getAdminJobsList();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <AdminJobsTable jobs={jobs} />
    </div>
  );
}
