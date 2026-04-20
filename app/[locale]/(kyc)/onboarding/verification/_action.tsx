"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import {
  syncEmailFromAuth,
  syncPhoneFromAuth,
} from "@/features/verification/dal/mutations";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const verifyDetailsAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { authUser, user } = await getCurrentUser({ allData: true });
  if (!authUser) return onboardingStepError("userNotAuthenticated");
  if (!user) return onboardingStepError("userNotFound");

  if (!user.is_email_verified) {
    if (!authUser.emailVerified || !authUser.email) {
      return onboardingStepError("emailNotVerified");
    }
    try {
      await syncEmailFromAuth(authUser.email);
    } catch (e) {
      return onboardingStepRawError(
        e instanceof Error ? e.message : "Failed to sync email",
      );
    }
  }
  if (!user.is_phone_verified) {
    if (!authUser.phoneNumber) return onboardingStepError("phoneNotVerified");
    try {
      await syncPhoneFromAuth(authUser.phoneNumber);
    } catch (e) {
      return onboardingStepRawError(
        e instanceof Error ? e.message : "Failed to sync phone",
      );
    }
  }

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
