"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const verifyDetailsAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { authUser, user } = await getCurrentUser({ allData: true });
  if (!authUser) return { ok: false, error: "User not authenticated" };
  if (!user) return { ok: false, error: "User not found" };

  if (!user.is_email_verified) return { ok: false, error: "Please verify your email address" };
  if (!user.is_phone_verified) return { ok: false, error: "Please verify your phone number" };

  const persist = await completeOnboardingStep("verification");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  const redirectTo =
    user.role === "worker" ? "/onboarding/profile" : "/onboarding/details";
  return { ok: true, redirectTo, steps: persist.steps };
};