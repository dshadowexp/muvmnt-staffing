"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const locationAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };

  const location = await getAddressLocation();
  if (!location) return { ok: false, error: "Please set location information" };

  const persist = await completeOnboardingStep("location");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  const redirectTo =
    user.role === "worker" ? "/onboarding/authorization" : "/onboarding/billing";
  return { ok: true, redirectTo, steps: persist.steps };
};