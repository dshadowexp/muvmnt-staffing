"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getBillingAccount } from "@/features/payments/billing/dal/queries";
import { updateUserIsActive } from "@/features/users/dal/mutations";
import { getSession } from "@/lib/session";

export const billingAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");

  const billingAccount = await getBillingAccount();
  if (!billingAccount) return onboardingStepError("billingSetupIncomplete");

  const persist = await completeOnboardingStep("billing", {
    markOnboardingCompleted: true,
  });
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  await updateUserIsActive(session.userId, true);

  return { ok: true, redirectTo: "/review", steps: persist.steps };
};
