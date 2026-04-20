"use client";

import { useActionState, useId } from "react";
import { skipOnboardingStepAction } from "@/features/onboarding/actions/skip-onboarding-step";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";

export interface OnboardingSkipDescriptor {
  formId: string;
  pending: boolean;
}

export function useOnboardingSkip() {
  const { step } = useOnboarding();
  const reactId = useId();
  const skipFormId = `onboarding-skip-${reactId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const [skipState, skipAction, skipPending] = useActionState(
    skipOnboardingStepAction,
    undefined,
  );
  useOnboardingFormNavigate(skipState);

  const show = step?.skippable === true && step != null;

  const skipForm = show ? (
    <form id={skipFormId} action={skipAction} hidden aria-hidden>
      <input type="hidden" name="stepId" value={step.id} />
    </form>
  ) : null;

  const skip: OnboardingSkipDescriptor | null = show
    ? { formId: skipFormId, pending: skipPending }
    : null;

  return { skipForm, skip };
}
