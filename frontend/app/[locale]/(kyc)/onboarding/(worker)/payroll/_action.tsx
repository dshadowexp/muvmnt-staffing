"use server";

import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { enqueueWorkerOnboardingSubmittedNotification } from "@/features/notifications/server/enqueue-worker-onboarding-submitted";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { payrollAccountMeetsOnboardingRequirements } from "@/features/payroll/dal/queries";

export const payrollAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return onboardingStepError("userNotFound");

  const payrollOk = await payrollAccountMeetsOnboardingRequirements(user.id);
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

  try {
    await enqueueWorkerOnboardingSubmittedNotification();
  } catch (err) {
    console.error("[payrollAction] onboarding submitted notification", err);
  }

  return { ok: true, redirectTo: "/review", steps: persist.steps };
};
