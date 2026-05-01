import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  BadgeCheckIcon,
  Building2Icon,
  CalendarDaysIcon,
  ListChecksIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

type MetricTone =
  | "default"
  | "primary"
  | "indigo"
  | "violet"
  | "emerald"
  | "amber"
  | "sky";

const toneStyles: Record<MetricTone, string> = {
  default: "bg-muted/40 text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export type AdminMetric = {
  label: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  tone?: MetricTone;
};

function MetricCard({ metric }: { metric: AdminMetric }) {
  const tone = toneStyles[metric.tone ?? "default"];

  const inner = (
    <Card className="@container/card h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardDescription className="text-xs uppercase tracking-wide">
            {metric.label}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[200px]/card:text-3xl">
            {metric.value}
          </CardTitle>
          {metric.description ? (
            <p className="text-muted-foreground text-xs">
              {metric.description}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            tone,
          )}
        >
          {metric.icon}
        </span>
      </CardHeader>
    </Card>
  );

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        className="group block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-0.5">
          {inner}
        </div>
      </Link>
    );
  }
  return inner;
}

export function AdminMetricCards({ metrics }: { metrics: AdminMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => (
        <MetricCard key={m.label} metric={m} />
      ))}
    </div>
  );
}

export const AdminMetricIcons = {
  facilities: <Building2Icon className="size-4" />,
  /** @deprecated Use facilities */
  clients: <Building2Icon className="size-4" />,
  operators: <UserCogIcon className="size-4" />,
  workers: <UsersIcon className="size-4" />,
  balance: <WalletIcon className="size-4" />,
  requests: <ListChecksIcon className="size-4" />,
  shifts: <CalendarDaysIcon className="size-4" />,
  authorization: <BadgeCheckIcon className="size-4" />,
};
