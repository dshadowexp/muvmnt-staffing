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
  const [workers, t] = await Promise.all([
    getAdminWorkersList(),
    getTranslations("dashboard.admin.lists.workers"),
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
      <AdminWorkersTable workers={workers} emptyLabel={t("empty")} />
    </div>
  );
}
