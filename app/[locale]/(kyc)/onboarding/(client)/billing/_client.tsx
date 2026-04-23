"use client";

import { unstable_rethrow } from "next/navigation";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { useActionState, useState, type SubmitEventHandler } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { billingAction } from "./_action";
import { useOnboardingSkip } from "@/features/onboarding/hooks/use-onboarding-skip";
import { setupBillingPortalAction } from "@/features/payments/billing/actions";
import { Check } from "lucide-react";

export function BillingClient({
  hasPaymentMethod,
}: {
  hasPaymentMethod: boolean;
}) {
  const [state, formAction] = useActionState(billingAction, undefined);
  useOnboardingFormNavigate(state);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("kyc.onboarding.forms.billing");
  const { skipForm, skip } = useOnboardingSkip();

  const handleSetup: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setupBillingPortalAction();
    } catch (error) {
      unstable_rethrow(error);
      toast.error(
        error instanceof Error ? error.message : t("somethingWentWrong"),
      );
      setLoading(false);
    }
  };

  return (
    <>
      {skipForm}
      {hasPaymentMethod ? (
        <form action={formAction} className="space-y-6">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Check className="size-4" aria-hidden />
            {t("complete")}
          </div>
          <ContinueButton text={t("finish")} />
        </form>
      ) : (
        <form onSubmit={handleSetup} className="space-y-6">
          <ContinueButton
            text={t("begin")}
            pending={loading}
            skip={skip}
          />
        </form>
      )}
    </>
  );
}
