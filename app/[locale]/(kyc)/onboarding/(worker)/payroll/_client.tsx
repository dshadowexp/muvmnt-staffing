"use client";

import { unstable_rethrow } from "next/navigation";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { SubmitEventHandler, useState } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { payrollAction } from "./_action";
import { setupPayrollAction } from "@/features/payments/payroll/actions";
import { Check, InfoIcon } from "lucide-react";

type PayrollInitialSnapshot = {
  accountId: string;
  completed: boolean;
  enabled: boolean;
} | null;

export function PayrollClient({
  initialPayroll,
}: {
  initialPayroll: PayrollInitialSnapshot;
}) {
  const [state, formAction] = useActionState(payrollAction, undefined);
  useOnboardingFormNavigate(state);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("kyc.onboarding.forms.payroll");

  const isStripeComplete =
    initialPayroll != null && initialPayroll.completed && initialPayroll.enabled;
  const showFinishOnboarding =
    initialPayroll != null && initialPayroll.accountId && !isStripeComplete;

  const handleSetup: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setupPayrollAction();
    } catch (error) {
      unstable_rethrow(error);
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
      setLoading(false);
    }
  };

  return (
    <>
      {isStripeComplete ? (
        <form action={formAction} className="space-y-6">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Check className="size-4" />
            {t("complete")}
          </div>
          <ContinueButton
            text={t("finish")}
          />
        </form>
      ) : (
        <form onSubmit={handleSetup} className="space-y-6">
          {showFinishOnboarding && initialPayroll && !initialPayroll.enabled && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{t("identityCheckNotice")}</p>
            </div>
          )}
          <ContinueButton
            text={showFinishOnboarding ? t("finishOnboarding") : t("begin")}
            pending={loading}
          />
        </form>
      )}
    </>
  );
}
