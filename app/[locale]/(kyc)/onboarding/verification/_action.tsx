"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const verifyDetailsAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { authUser, user } = await getCurrentUser({ allData: true });
  if (!authUser) return onboardingStepError("userNotAuthenticated");
  if (!user) return onboardingStepError("userNotFound");

  if (!user.is_email_verified) return onboardingStepError("emailNotVerified");
  if (!user.is_phone_verified) return onboardingStepError("phoneNotVerified");

  const persist = await completeOnboardingStep("verification");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  const redirectTo =
    user.role === "worker" ? "/onboarding/profile" : "/onboarding/details";
  return { ok: true, redirectTo, steps: persist.steps };
};
