"use server";

import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import { getSession } from "@/lib/session";
import { payrollAccountMeetsOnboardingRequirements } from "@/features/payments/payroll/dal/queries";
import { updateUserIsActive } from "@/features/users/dal/mutations";

export const payrollAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  if (session.role !== "worker") return onboardingStepError("userNotAuthorized");

  const payrollOk = await payrollAccountMeetsOnboardingRequirements(session.userId);
  if (!payrollOk.ok) {
    return onboardingStepRawError(payrollOk.message);
  }

  const persist = await completeOnboardingStep("payroll", {
    markOnboardingCompleted: true,
  });
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  await updateUserIsActive(session.userId, true);

  return { ok: true, redirectTo: "/review", steps: persist.steps };
};
