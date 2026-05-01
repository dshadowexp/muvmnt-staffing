import { AdminOperatorsTable } from "@/features/admin/components/admin-data-tables";
import { getAdminOperatorsList } from "@/features/admin/dal/queries";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.admin.meta" });
  return { title: t("operators") };
}

export default async function AdminOperatorsPage() {
  const [operators, t] = await Promise.all([
    getAdminOperatorsList(),
    getTranslations("dashboard.admin.lists.operators"),
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
      <AdminOperatorsTable operators={operators} emptyLabel={t("empty")} />
    </div>
  );
}
