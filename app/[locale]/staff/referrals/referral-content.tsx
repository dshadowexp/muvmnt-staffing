import { getTranslations } from "next-intl/server";
import { ClockIcon, DollarSignIcon, GiftIcon, UserPlus2Icon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSession } from "@/lib/get-session";
import { loadReferralViewData } from "@/features/referrals/lib/load-referral-view-data";
import { buildReferralUrl } from "@/features/referrals/lib/build-referral-url";
import { cn } from "@/lib/utils";
import { ReferralLinkSection, type ReferralLinkDef } from "./_client";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border px-2 py-3">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export async function ReferralContent({ className }: { className?: string }) {
  const [data, session, t] = await Promise.all([
    loadReferralViewData(),
    getSession(),
    getTranslations("referral.dialog"),
  ]);
  const role = session?.role?.toLowerCase() ?? null;

  const links: ReferralLinkDef[] = (() => {
    if (!data.code) return [];
    if (role === "admin") {
      return [
        {
          target: "worker",
          url: buildReferralUrl(data.code, { as: "worker" }),
          label: t("yourLinkWorker"),
        },
        {
          target: "client",
          url: buildReferralUrl(data.code, { as: "client" }),
          label: t("yourLinkClient"),
        },
      ];
    }
    return [
      { target: "self", url: buildReferralUrl(data.code), label: t("yourLink") },
    ];
  })();

  const rewardRows: { Icon: LucideIcon; line: string }[] =
    role === "worker"
      ? [
          { Icon: DollarSignIcon, line: t("rewardsWorker.line1") },
          { Icon: GiftIcon, line: t("rewardsWorker.line2") },
        ]
      : role === "client"
        ? [
            { Icon: ClockIcon, line: t("rewardsClient.line1") },
            { Icon: GiftIcon, line: t("rewardsClient.line2") },
          ]
        : [
            { Icon: UserPlus2Icon, line: t("rewardsAdmin.line1") },
            { Icon: GiftIcon, line: t("rewardsAdmin.line2") },
          ];

  const stats = data.stats;
  const showClientFreeHrs = role === "client";

  return (
    <div className={cn("flex min-w-0 flex-col gap-5", className)}>
      {data.error && <p className="text-destructive text-sm">{data.error}</p>}

      {links.length > 0 && (
        <ReferralLinkSection
          links={links}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
          shareTitle={t("shareTitle")}
          linkCopied={t("linkCopied")}
          copyFailed={t("copyFailed")}
        />
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("rewards")}</p>
        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
          {rewardRows.map(({ Icon, line }, i) => (
            <div key={i} className="flex gap-2.5 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard label={t("statsReferred")} value={String(stats.totalReferred)} />
          <StatCard label={t("statsCompleted")} value={String(stats.totalCompleted)} />
          {showClientFreeHrs ? (
            <StatCard label={t("statsFreeHrs")} value={`${stats.freeHoursEarned}h`} />
          ) : (
            <StatCard
              label={t("statsEarned")}
              value={`$${(stats.totalRewardCents / 100).toFixed(2)}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
