"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CircleDashedIcon } from "lucide-react";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { claimReferralCode } from "./_actions";

export function ClaimReferralRedirect({
  code,
  locale,
}: {
  code: string;
  locale: Locale;
}) {
  const t = useTranslations("referral.claim");
  const searchParams = useSearchParams();
  const invokedRef = useRef(false);

  useEffect(() => {
    if (invokedRef.current) return;
    invokedRef.current = true;
    // Server action sets the referral cookie (when anonymous) and redirects.
    // Pass through the `?as=` hint so admin invites land on the right role.
    void claimReferralCode(code, locale, searchParams.get("as"));
  }, [code, locale, searchParams]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <CircleDashedIcon className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {t("applying")}
      </p>
    </div>
  );
}
