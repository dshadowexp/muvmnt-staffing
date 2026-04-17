import { AdminClientsTable } from "@/features/admin/components/admin-data-tables";
import { getAdminClientsList } from "@/features/admin/dal/queries";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.admin.meta" });
  return { title: t("clients") };
}

export default async function AdminClientsPage() {
  const clients = await getAdminClientsList();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <AdminClientsTable clients={clients} />
    </div>
  );
}
