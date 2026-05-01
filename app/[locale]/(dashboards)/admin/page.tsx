import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  AdminMetricCards,
  AdminMetricIcons,
  type AdminMetric,
} from "@/features/admin/components/admin-metric-cards";
import { AdminActions } from "@/features/admin/components/admin-actions";
import {
  getAdminFacilitiesList,
  getAdminDashboardSnapshot,
} from "@/features/admin/dal/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.admin.meta" });
  return { title: t("home") };
}

function formatBalance(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(0)}`;
  }
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-CA");

export default async function AdminDashboardPage() {
  const [d, facilities, t, tNav] = await Promise.all([
    getAdminDashboardSnapshot(),
    getAdminFacilitiesList(500),
    getTranslations("dashboard.admin.home"),
    getTranslations("dashboard.admin.home.metrics"),
  ]);

  const metrics: AdminMetric[] = [
    {
      label: tNav("facilities"),
      value: NUMBER_FORMATTER.format(d.facilityCount),
      description: tNav("facilitiesDescription"),
      icon: AdminMetricIcons.facilities,
      href: "/admin/facilities",
      tone: "indigo",
    },
    {
      label: tNav("operators"),
      value: NUMBER_FORMATTER.format(d.operatorCount),
      description: tNav("operatorsDescription"),
      icon: AdminMetricIcons.operators,
      href: "/admin/operators",
      tone: "violet",
    },
    {
      label: tNav("workers"),
      value: NUMBER_FORMATTER.format(d.workerCount),
      description: tNav("workersDescription"),
      icon: AdminMetricIcons.workers,
      href: "/admin/workers",
      tone: "violet",
    },
    {
      label: tNav("balance"),
      value: formatBalance(d.balanceCents, d.balanceCurrency),
      description: tNav("balanceDescription"),
      icon: AdminMetricIcons.balance,
      tone: "emerald",
    },
    {
      label: tNav("requests"),
      value: NUMBER_FORMATTER.format(d.jobCount),
      description: tNav("requestsDescription"),
      icon: AdminMetricIcons.requests,
      href: "/admin/requests",
      tone: "primary",
    },
    {
      label: tNav("shifts"),
      value: NUMBER_FORMATTER.format(d.shiftCount),
      description: tNav("shiftsDescription"),
      icon: AdminMetricIcons.shifts,
      href: "/admin/shifts",
      tone: "sky",
    },
  ];

  const actionFacilities = facilities.map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </div>

      <AdminMetricCards metrics={metrics} />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-medium">{t("quickActionsTitle")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("quickActionsSubtitle")}
          </p>
        </div>
        <AdminActions facilities={actionFacilities} />
      </div>
    </div>
  );
}
