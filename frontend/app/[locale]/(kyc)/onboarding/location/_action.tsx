"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const locationAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return onboardingStepError("userNotFound");

  const location = await getAddressLocation();
  if (!location) return onboardingStepError("locationMissing");

  const persist = await completeOnboardingStep("location");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  const redirectTo =
    user.role === "worker" ? "/onboarding/authorization" : "/onboarding/billing";
  return { ok: true, redirectTo, steps: persist.steps };
};
