import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DollarSignIcon, GiftIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { loadReferralViewData } from "@/features/referrals/lib/load-referral-view-data";
import { buildReferralUrl } from "@/features/referrals/lib/build-referral-url";
import { cn } from "@/lib/utils";
import { ReferralLinkSection, type ReferralLinkDef } from "./_client";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "referral.page" });
  return { title: t("title") };
}

export default async function ReferralPage() {
  const t = await getTranslations("referral.page");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("title")}</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-10 w-full" />}> 
        <ReferralContent className="w-full" />
      </Suspense>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border px-2 py-3">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export async function ReferralContent({ className }: { className?: string }) {
  const [data, t] = await Promise.all([
    loadReferralViewData(),
    getTranslations("referral.dialog"),
  ]);

  const links: ReferralLinkDef[] = (() => {
    if (!data.code) return [];
    return [
      { target: "self", url: buildReferralUrl(data.code), label: t("yourLink") },
    ];
  })();

  const rewardRows: { Icon: LucideIcon; line: string }[] =
    [
      { Icon: DollarSignIcon, line: t("rewardsWorker.line1") },
      { Icon: GiftIcon, line: t("rewardsWorker.line2") },
    ];

  const stats = data.stats;

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
          <StatCard
            label={t("statsEarned")}
            value={`$${(stats.totalRewardCents / 100).toFixed(2)}`}
          />
        </div>
      )}
    </div>
  );
}

