"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getBillingAccount } from "@/features/billing/dal/queries";
import { updateUserIsActive } from "@/features/users/dal/mutations";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const billingAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return onboardingStepError("userNotFound");

  const billingAccount = await getBillingAccount();
  if (!billingAccount) return onboardingStepError("billingSetupIncomplete");

  const persist = await completeOnboardingStep("billing");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  await updateUserIsActive(user.id, true);

  return { ok: true, redirectTo: "/app", steps: persist.steps };
};
