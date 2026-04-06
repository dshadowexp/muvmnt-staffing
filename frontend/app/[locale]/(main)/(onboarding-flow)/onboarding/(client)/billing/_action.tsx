"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getBillingAccount } from "@/features/billing/dal/queries";
import { updateUserIsActive } from "@/features/users/dal/mutations";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const billingAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };

  const billingAccount = await getBillingAccount();
  if (!billingAccount) return { ok: false, error: "Please complete billing setup" };

  const persist = await completeOnboardingStep("billing");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  await updateUserIsActive(user.id, true);

  return { ok: true, redirectTo: "/app", steps: persist.steps };
};