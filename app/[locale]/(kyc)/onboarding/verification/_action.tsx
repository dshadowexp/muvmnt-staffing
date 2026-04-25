"use server";

import { getFirebaseUser } from "@/features/auth/actions";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getCurrentUser } from "@/features/users/dal/queries";
import {
  syncEmailFromAuth,
  syncPhoneFromAuth,
} from "@/features/verification/dal/mutations";

export const verifyDetailsAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const user = await getCurrentUser();
  if (!user) return onboardingStepError("userNotFound");
  const firebaseUser = await getFirebaseUser(user.auth_id);
  if (!firebaseUser) return onboardingStepError("userNotAuthenticated");

  if (!user.is_email_verified) {
    if (!firebaseUser.emailVerified || !firebaseUser.email) {
      return onboardingStepError("emailNotVerified");
    }
    try {
      await syncEmailFromAuth(firebaseUser.email);
    } catch (e) {
      return onboardingStepRawError(
        e instanceof Error ? e.message : "Failed to sync email",
      );
    }
  }
  if (user.role === "worker" && !user.is_phone_verified) {
    if (!firebaseUser.phoneNumber) return onboardingStepError("phoneNotVerified");
    try {
      await syncPhoneFromAuth(firebaseUser.phoneNumber);
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
