"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { skipOnboardingStepAction } from "@/features/onboarding/actions/skip-onboarding-step";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useOnboardingSkip() {
  const { step } = useOnboarding();
  const { loading: authLoading } = useAuth();
  const t = useTranslations("kyc.onboarding");
  const reactId = useId();
  const skipFormId = `onboarding-skip-${reactId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const [skipState, skipAction, skipPending] = useActionState(
    skipOnboardingStepAction,
    undefined,
  );
  useOnboardingFormNavigate(skipState);

  const show = step?.skippable === true && step != null;
  const disabled = skipPending || authLoading;

  const skipForm = show ? (
    <form id={skipFormId} action={skipAction} hidden aria-hidden>
      <input type="hidden" name="stepId" value={step.id} />
    </form>
  ) : null;

  const skipSlot = show ? (
    <Button
      type="submit"
      form={skipFormId}
      variant="outline"
      size="default"
      disabled={disabled}
    >
      <LoadingSwap isLoading={skipPending || authLoading}>{t("skip")}</LoadingSwap>
    </Button>
  ) : null;

  return { skipForm, skipSlot, skipPending };
}
