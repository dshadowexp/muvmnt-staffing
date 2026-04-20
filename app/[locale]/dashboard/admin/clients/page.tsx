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
  const [clients, t] = await Promise.all([
    getAdminClientsList(),
    getTranslations("dashboard.admin.lists.clients"),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </div>
      <AdminClientsTable clients={clients} emptyLabel={t("empty")} />
    </div>
  );
}
