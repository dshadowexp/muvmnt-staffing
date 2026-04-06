"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getCertifications } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const certificationsAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };

  const certifications = await getCertifications();
  if (certifications.length === 0) return { ok: false, error: "Add resume" };

  const persist = await completeOnboardingStep("certifications");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  return { ok: true, redirectTo: "/onboarding/payroll", steps: persist.steps };
};