"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DollarSignIcon,
  GiftIcon,
  Loader2,
  ShareIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { env } from "@/data/env/client";
import {
  getOrCreateReferralCodeAction,
  getReferralStatsAction,
} from "@/features/referrals/actions";
import type { ReferralStats } from "@/features/referrals/dal/queries";

type Role = "worker" | "client";

function buildReferralUrl(code: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}/refer/${code}`;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function ReferralDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
}) {
  const t = useTranslations("referral.dialog");
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, startTransition] = useTransition();

  const rewards = useMemo(() => {
    if (role === "worker") {
      return [
        { icon: DollarSignIcon, line: t("rewardsWorker.line1") },
        { icon: GiftIcon, line: t("rewardsWorker.line2") },
      ];
    }
    return [
      { icon: ClockIcon, line: t("rewardsClient.line1") },
      { icon: GiftIcon, line: t("rewardsClient.line2") },
    ];
  }, [role, t]);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const [codeRes, statsRes] = await Promise.all([
        getOrCreateReferralCodeAction(),
        getReferralStatsAction(),
      ]);
      if (codeRes.code) setCode(codeRes.code);
      if (!statsRes.error) setStats(statsRes.stats);
    });
  }, [open]);

  const referralUrl = code ? buildReferralUrl(code) : "";

  async function copyLink() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  async function shareLink() {
    if (!referralUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: t("shareTitle"),
        url: referralUrl,
      });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,600px)] gap-4 overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("yourLink")}</p>
            {loading && !code ? (
              <div className="flex h-10 items-center justify-center rounded-xl border bg-muted/30">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex min-w-0 gap-2">
                <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border bg-muted/30 px-3 py-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {referralUrl}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={copyLink}
                  disabled={!code}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  {copied ? t("copied") : t("copy")}
                </Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={shareLink}
                    disabled={!code}
                  >
                    <ShareIcon className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("rewards")}</p>
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              {rewards.map(({ icon: Icon, line }, i) => (
                <div key={i} className="flex gap-2.5 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                label={t("statsReferred")}
                value={String(stats.totalReferred)}
              />
              <StatCard
                label={t("statsCompleted")}
                value={String(stats.totalCompleted)}
              />
              {role === "worker" ? (
                <StatCard
                  label={t("statsEarned")}
                  value={`$${(stats.totalRewardCents / 100).toFixed(2)}`}
                />
              ) : (
                <StatCard
                  label={t("statsFreeHrs")}
                  value={`${stats.freeHoursEarned}h`}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
