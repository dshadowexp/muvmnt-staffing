"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, ShareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReferralRoleHint } from "@/features/referrals/lib/build-referral-url";

export type ReferralLinkDef = {
  target: ReferralRoleHint | "self";
  url: string;
  label: string;
};

type ReferralLinkSectionProps = {
  links: ReferralLinkDef[];
  copyLabel: string;
  copiedLabel: string;
  shareTitle: string;
  linkCopied: string;
  copyFailed: string;
};

function LinkRow({
  url,
  onCopy,
  onShare,
  copied,
  copyLabel,
  copiedLabel,
  canShare,
}: {
  url: string;
  onCopy: () => void;
  onShare: () => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  canShare: boolean;
}) {
  return (
    <div className="flex min-w-0 gap-2">
      <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border bg-muted/30 px-3 py-2">
        <span className="truncate font-mono text-xs text-muted-foreground">{url}</span>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={onCopy}
        disabled={!url}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
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

/** Copy, share, and `navigator.share` gating for referral URLs (server provides URLs + labels). */
export function ReferralLinkSection({
  links,
  copyLabel,
  copiedLabel,
  shareTitle,
  linkCopied,
  copyFailed,
}: ReferralLinkSectionProps) {
  const [copiedTarget, setCopiedTarget] = useState<ReferralRoleHint | "self" | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const copyTo = useCallback(
    async (target: ReferralRoleHint | "self", url: string) => {
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedTarget(target);
        toast.success(linkCopied);
        setTimeout(() => setCopiedTarget(null), 2000);
      } catch {
        toast.error(copyFailed);
      }
    },
    [copyFailed, linkCopied],
  );

  const shareLink = useCallback(
    async (url: string) => {
      if (!url || !navigator.share) return;
      try {
        await navigator.share({ title: shareTitle, url });
      } catch {
        /* user cancelled */
      }
    },
    [shareTitle],
  );

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div key={link.target} className="space-y-1.5">
          <p className="text-sm font-medium">{link.label}</p>
          <LinkRow
            url={link.url}
            onCopy={() => copyTo(link.target, link.url)}
            onShare={() => shareLink(link.url)}
            copied={copiedTarget === link.target}
            copyLabel={copyLabel}
            copiedLabel={copiedLabel}
            canShare={canShare}
          />
        </div>
      ))}
    </div>
  );
}
