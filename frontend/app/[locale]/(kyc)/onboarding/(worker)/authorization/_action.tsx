"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getWorkAuthorization, getWorkerProfile } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const authorizationAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return onboardingStepError("userNotFound");

  const profile = await getWorkerProfile();
  if (!profile) return onboardingStepError("profileMissing");
  if (profile.photo_url === null) return onboardingStepError("photoMissing");

  const workAuthorization = await getWorkAuthorization();
  if (!workAuthorization) return onboardingStepError("workAuthorizationMissing");

  const persist = await completeOnboardingStep("authorization");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return {
    ok: true,
    redirectTo: "/onboarding/availability",
    steps: persist.steps,
  };
};
