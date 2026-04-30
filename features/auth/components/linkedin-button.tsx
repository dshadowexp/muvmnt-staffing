"use client";

import posthog from "posthog-js";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { getAuthErrorKey, loginWithLinkedIn } from "@/services/firebase/auth";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { cn } from "@/lib/utils";

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.046c.476-.9 1.637-1.85 3.369-1.85 3.6 0 4.268 2.37 4.268 5.455v6.286z"
        fill="#0A66C2"
      />
      <path d="M5.337 7.433a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12z" fill="#0A66C2" />
      <path d="M6.777 20.452H3.894V9h2.883v11.452z" fill="#0A66C2" />
    </svg>
  );
}

export function LinkedInButton({
  text = "LinkedIn",
  className,
  disabled = false,
}: {
  text?: string;
  className?: string;
  disabled?: boolean;
}) {
  const tErrors = useTranslations("auth.errors");
  const { loading } = useAuth();
  const busy = loading || disabled;

  const handleLinkedIn = async () => {
    if (busy) return;
    try {
      await loginWithLinkedIn();
      posthog.capture("user_signed_in_with_linkedin", { method: "linkedin" });
    } catch (err) {
      console.error("LinkedIn error:", err);
      const key = getAuthErrorKey(err);
      if (key) toast.error(tErrors(key));
      posthog.captureException(err);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLinkedIn}
      disabled={busy}
      className={cn("gap-2.5 text-[0.9rem] font-medium", className ?? "w-full")}
    >
      <LinkedInIcon />
      <LoadingSwap isLoading={busy}>
        <span>{text}</span>
      </LoadingSwap>
    </Button>
  );
}

