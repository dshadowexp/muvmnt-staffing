"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useOnboarding } from "../onboarding-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";
import type { OnboardingSkipDescriptor } from "../hooks/use-onboarding-skip";

interface ContinueButtonProps {
  id?: string;
  text?: string;
  pending?: boolean;
  skip?: OnboardingSkipDescriptor | null;
}

export function ContinueButton({
  text,
  pending: pendingProp,
  skip,
}: ContinueButtonProps) {
  const { back, isFirstStep, steps, currentStepIndex } = useOnboarding();
  const { pending: formActionPending } = useFormStatus();
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("kyc.onboarding");

  const submitPending = pendingProp ?? formActionPending;
  const skipPending = skip?.pending ?? false;
  const anyLoading = submitPending || authLoading || skipPending;

  function handleBack() {
    if (isFirstStep) return;
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      back();
      router.push(prevStep.route);
    }
  }

  return (
    <div className="flex w-full items-center justify-between pt-6">
      {isFirstStep ? (
        <span />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1.5"
          disabled={anyLoading}
        >
          <ChevronLeft className="size-4" />
          {t("back")}
        </Button>
      )}
      <div className="flex items-center gap-2">
        {skip && (
          <Button
            type="submit"
            form={skip.formId}
            variant="outline"
            size="default"
            disabled={anyLoading}
          >
            <LoadingSwap isLoading={skipPending}>{t("skip")}</LoadingSwap>
          </Button>
        )}
        <Button type="submit" variant="default" disabled={anyLoading}>
          <LoadingSwap isLoading={submitPending || authLoading}>
            {text ?? t("continue")}
          </LoadingSwap>
        </Button>
      </div>
    </div>
  );
}
