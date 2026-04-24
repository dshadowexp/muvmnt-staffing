"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FingerprintIcon } from "lucide-react";
import { startIdentityVerificationAction } from "@/features/verification/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { IdentityVerificationData } from "@/features/profile/components/worker-account-profile";
import { useRouter } from "@/i18n/navigation";

type Props = {
  identityVerification: IdentityVerificationData;
};

export function IdentityVerificationPendingCard({ identityVerification }: Props) {
  const t = useTranslations("dashboard.worker.home.identityVerification");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    startIdentityVerificationAction,
    null,
  );

  useEffect(() => {
    if (state && "refresh" in state && state.refresh) {
      router.refresh();
    }
  }, [state, router]);

  const isVerified = identityVerification?.verified === true;
  if (isVerified) return null;

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="rounded-md bg-muted p-2 mt-0.5">
          <FingerprintIcon className="size-5 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <form action={formAction}>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("beginning") : t("beginVerification")}
          </Button>
        </form>
        {state && "error" in state && state.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
