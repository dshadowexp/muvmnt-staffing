"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getSession } from "@/lib/session";
import { updateUserIsActive } from "@/features/users/dal/mutations";

export const complianceAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  
  const persist = await completeOnboardingStep("compliance", {
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
