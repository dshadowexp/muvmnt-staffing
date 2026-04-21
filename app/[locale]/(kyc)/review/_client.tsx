"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ClipboardCheck, CircleDashedIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function ReviewClient() {
  const { authUser, reloadToken, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("kyc.review");


  useEffect(() => {
    async function runReloadToken() {
      await reloadToken();
    }

    runReloadToken();
  }, []);

  useEffect(() => {
    if (loading || !authUser?.isActive) return;
    router.replace(`/dashboard`);
  }, [loading, authUser, router]);

  if (loading || authUser?.isActive) {
    return <CircleDashedIcon className="size-4 animate-spin" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 px-4 py-5 sm:flex-row sm:items-start">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardCheck className="size-6" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-medium text-foreground">{t("title")}</p>
          <p className="text-muted-foreground">
            {t("bodyPrefix")}{" "}
            <span className="font-medium text-foreground">{t("bodyHighlight")}</span>
            {t("bodySuffix")}
          </p>
        </div>
      </div>
      <Alert>
        <AlertTitle>{t("nextTitle")}</AlertTitle>
        <AlertDescription className="text-muted-foreground">{t("nextBody")}</AlertDescription>
      </Alert>
    </div>
  );
}
