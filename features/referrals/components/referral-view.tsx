"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  CheckIcon,
  CircleDashedIcon,
  ClockIcon,
  CopyIcon,
  DollarSignIcon,
  GiftIcon,
  ShareIcon,
  UserPlus2Icon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getOrCreateReferralCodeAction,
  getReferralStatsAction,
} from "@/features/referrals/actions";
import { buildReferralUrl } from "@/features/referrals/lib/build-referral-url";
import type {
  ReferralRoleHint,
} from "@/features/referrals/lib/build-referral-url";
import type { ReferralStats } from "@/features/referrals/dal/queries";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type ReferralRole = "worker" | "client" | "admin";

type Reward = { icon: LucideIcon; line: string };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border px-2 py-3">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function LinkRow({
  url,
  loading,
  onCopy,
  onShare,
  copied,
  copyLabel,
  copiedLabel,
  canShare,
}: {
  url: string;
  loading: boolean;
  onCopy: () => void;
  onShare: () => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  /** Resolved post-mount on the client; never true during SSR. */
  canShare: boolean;
}) {
  if (loading && !url) {
    return (
      <div className="flex h-10 items-center justify-center rounded-xl border bg-muted/30">
        <CircleDashedIcon className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 gap-2">
      <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border bg-muted/30 px-3 py-2">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {url}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={onCopy}
        disabled={!url}
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
        {copied ? copiedLabel : copyLabel}
      </Button>
      {canShare && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={onShare}
          disabled={!url}
        >
          <ShareIcon className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Headless referral panel — renders link, rewards and stats for the current
 * user. Shared between the dialog (footer entry-point) and the dedicated
 * `/{role}/referrals` pages so the UI stays in lock-step.
 *
 * For admins: the panel exposes both worker- and client-targeted invite
 * links since the same code is used to refer either role.
 */
export function ReferralView({
  enabled = true,
  className,
}: {
  enabled?: boolean;
  className?: string;
}) {
  const { authUser } = useAuth();
  const role = authUser?.role ?? null;
  const t = useTranslations("referral.dialog");
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<ReferralRoleHint | "self" | null>(null);
  const [loading, startTransition] = useTransition();
  // `navigator.share` is browser-only — keep it out of the SSR pass to avoid
  // a hydration mismatch with the server render.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const rewards = useMemo<Reward[]>(() => {
    if (role === "worker") {
      return [
        { icon: DollarSignIcon, line: t("rewardsWorker.line1") },
        { icon: GiftIcon, line: t("rewardsWorker.line2") },
      ];
    }
    if (role === "client") {
      return [
        { icon: ClockIcon, line: t("rewardsClient.line1") },
        { icon: GiftIcon, line: t("rewardsClient.line2") },
      ];
    }
    return [
      { icon: UserPlus2Icon, line: t("rewardsAdmin.line1") },
      { icon: GiftIcon, line: t("rewardsAdmin.line2") },
    ];
  }, [role, t]);

  useEffect(() => {
    if (!enabled) return;
    startTransition(async () => {
      const [codeRes, statsRes] = await Promise.all([
        getOrCreateReferralCodeAction(),
        getReferralStatsAction(),
      ]);
      if (codeRes.code) setCode(codeRes.code);
      if (!statsRes.error) setStats(statsRes.stats);
    });
  }, [enabled]);

  async function copyTo(target: ReferralRoleHint | "self", url: string) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTarget(target);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  async function shareLink(url: string) {
    if (!url || !navigator.share) return;
    try {
      await navigator.share({ title: t("shareTitle"), url });
    } catch {
      /* user cancelled */
    }
  }

  // Build the link variants. Admins get two targeted links; everyone else gets one.
  const links = useMemo(() => {
    if (!code) return [] as Array<{ target: ReferralRoleHint | "self"; url: string; label: string }>;
    if (role === "admin") {
      return [
        {
          target: "worker" as const,
          url: buildReferralUrl(code, { as: "worker" }),
          label: t("yourLinkWorker"),
        },
        {
          target: "client" as const,
          url: buildReferralUrl(code, { as: "client" }),
          label: t("yourLinkClient"),
        },
      ];
    }
    return [
      {
        target: "self" as const,
        url: buildReferralUrl(code),
        label: t("yourLink"),
      },
    ];
  }, [code, role, t]);

  return (
    <div className={cn("flex min-w-0 flex-col gap-5", className)}>
      <div className="space-y-3">
        {links.length === 0 ? (
          <LinkRow
            url=""
            loading={loading}
            onCopy={() => {}}
            onShare={() => {}}
            copied={false}
            copyLabel={t("copy")}
            copiedLabel={t("copied")}
            canShare={canShare}
          />
        ) : (
          links.map((link) => (
            <div key={link.target} className="space-y-1.5">
              <p className="text-sm font-medium">{link.label}</p>
              <LinkRow
                url={link.url}
                loading={loading}
                onCopy={() => copyTo(link.target, link.url)}
                onShare={() => shareLink(link.url)}
                copied={copiedTarget === link.target}
                copyLabel={t("copy")}
                copiedLabel={t("copied")}
                canShare={canShare}
              />
            </div>
          ))
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
          {role === "client" ? (
            <StatCard
              label={t("statsFreeHrs")}
              value={`${stats.freeHoursEarned}h`}
            />
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
