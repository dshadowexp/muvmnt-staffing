"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { claimReferralCode } from "./actions";

export function ClaimReferralRedirect({
  code,
  locale,
}: {
  code: string;
  locale: Locale;
}) {
  const t = useTranslations("referral.claim");
  const invokedRef = useRef(false);

  useEffect(() => {
    if (invokedRef.current) return;
    invokedRef.current = true;
    // Server action sets the referral cookie (when anonymous) and redirects.
    void claimReferralCode(code, locale);
  }, [code, locale]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {t("applying")}
      </p>
    </div>
  );
}
