"use client";

import posthog from "posthog-js";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { getAuthErrorKey, loginWithFacebook } from "@/services/firebase/auth";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { cn } from "@/lib/utils";

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 12.06C22 6.504 17.523 2 12 2S2 6.504 2 12.06C2 17.08 5.657 21.24 10.438 22v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.198 2.238.198v2.475h-1.26c-1.242 0-1.63.777-1.63 1.574v1.89h2.773l-.443 2.91h-2.33V22C18.343 21.24 22 17.08 22 12.06Z"
        fill="#1877F2"
      />
      <path
        d="M15.893 14.97l.443-2.91h-2.773v-1.89c0-.797.388-1.574 1.63-1.574h1.26V6.12s-1.144-.198-2.238-.198c-2.285 0-3.777 1.393-3.777 3.915v2.215h-2.54v2.91h2.54V22c.508.08 1.03.12 1.562.12.532 0 1.054-.04 1.562-.12v-7.03h2.33Z"
        fill="white"
      />
    </svg>
  );
}

export function FacebookButton({
  text = "Facebook",
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

  const handleFacebook = async () => {
    if (busy) return;
    try {
      await loginWithFacebook();
      posthog.capture("user_signed_in_with_facebook", { method: "facebook" });
    } catch (err) {
      const key = getAuthErrorKey(err);
      if (key) toast.error(tErrors(key));
      posthog.captureException(err);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleFacebook}
      disabled={busy}
      className={cn("gap-2.5 text-[0.9rem] font-medium", className ?? "w-full")}
    >
      <FacebookIcon />
      <LoadingSwap isLoading={busy}>
        <span>{text}</span>
      </LoadingSwap>
    </Button>
  );
}

