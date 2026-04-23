"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { setupBillingPortalAction } from "@/features/payments/billing/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { CircleDashedIcon, CreditCardIcon } from "lucide-react";

function ManageBillingSubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("dashboard.client.billing");

  return (
    <Button
      type="submit"
      className="w-full sm:w-auto"
      disabled={pending}
      size="lg"
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <CircleDashedIcon
            className="size-4 shrink-0 animate-spin"
            aria-hidden
          />
        ) : (
          <CreditCardIcon className="size-4 shrink-0" aria-hidden />
        )}
        {pending ? t("manageBillingPending") : t("manageBilling")}
      </span>
    </Button>
  );
}

export function ClientAccountBillingPanel() {
  const t = useTranslations("dashboard.client.billing");

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="text-base leading-tight">
            {t("portalCardTitle")}
          </CardTitle>
        </div>
        <form
          action={setupBillingPortalAction}
          className="w-full shrink-0 sm:w-auto"
        >
          <ManageBillingSubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
