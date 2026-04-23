import { ChevronRight, Globe, Zap, ZapOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import {
  formatSlot,
  isDefaultWeek,
  summarizeWeek,
} from "@/features/availability/lib/summarize-week";

export async function AvailabilitySummaryCard({
  data,
}: {
  data: WorkerAvailabilityInitial;
}) {
  const t = await getTranslations("dashboard.worker.availability.summary");
  const groups = summarizeWeek(data.week);
  const showDefault =
    isDefaultWeek(data.week) && data.timezone === "America/Toronto";

  return (
    <Link
      href="/dashboard/availability/edit"
      aria-label={t("editAria")}
      className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="border-border/80 transition-colors hover:border-primary/40 hover:bg-muted/30">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{t("cardTitle")}</p>
              {showDefault ? (
                <Badge variant="secondary" className="text-xs">
                  {t("defaultBadge")}
                </Badge>
              ) : null}
            </div>
            <div className="space-y-0.5 text-sm text-muted-foreground">
              {groups.length > 0 ? (
                groups.map((g) => (
                  <p key={g.dayLabel}>
                    {g.dayLabel}, {g.slots.map(formatSlot).join(", ")}
                  </p>
                ))
              ) : (
                <p>{t("noHours")}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="size-3.5" />
              <span>{data.timezone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {data.autoConfirm ? (
                <Zap className="size-3.5 text-amber-500" />
              ) : (
                <ZapOff className="size-3.5" />
              )}
              <span>
                {data.autoConfirm ? t("autoConfirmEnabled") : t("autoConfirmDisabled")}
              </span>
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export function AvailabilitySummaryCardSkeleton() {
  return (
    <Card className="border-border/80">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="size-5 rounded-md" />
      </CardContent>
    </Card>
  );
}
