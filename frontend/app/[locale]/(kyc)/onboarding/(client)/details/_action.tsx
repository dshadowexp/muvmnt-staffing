"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { createClientAction } from "@/features/account/actions";
import { clientSchema, type ClientProfileValues } from "@/features/account/schemas/client";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export async function detailsAction(
  input: ClientProfileValues,
): Promise<OnboardingStepFormState> {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return onboardingStepError("userNotFound");
  if (user.role !== "client") return onboardingStepError("userNotAuthorized");

  const { success, data } = clientSchema.safeParse(input);
  if (!success) return onboardingStepError("invalidClientData");

  const { error, message } = await createClientAction(data);
  if (error) return onboardingStepRawError(message);

  const persist = await completeOnboardingStep("details");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return { ok: true, redirectTo: "/onboarding/location", steps: persist.steps };
}
