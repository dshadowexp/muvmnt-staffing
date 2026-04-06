"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getWorkAuthorization, getWorkerProfile } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const authorizationAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };

  const profile = await getWorkerProfile();
  if (!profile) return { ok: false, error: "Please set your profile" };
  if (profile.photo_url === null) return { ok: false, error: "Please set your photo" };

  const workAuthorization = await getWorkAuthorization();
  if (!workAuthorization) return { ok: false, error: "Please set work authorization" };

  const persist = await completeOnboardingStep("authorization");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  return {
    ok: true,
    redirectTo: "/onboarding/certifications",
    steps: persist.steps,
  };
};