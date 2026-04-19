import { AdminWorkersTable } from "@/features/admin/components/admin-data-tables";
import { getAdminWorkersList } from "@/features/admin/dal/queries";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.admin.meta" });
  return { title: t("workers") };
}

export default async function AdminWorkersPage() {
  const workers = await getAdminWorkersList();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <AdminWorkersTable workers={workers} />
    </div>
  );
}
