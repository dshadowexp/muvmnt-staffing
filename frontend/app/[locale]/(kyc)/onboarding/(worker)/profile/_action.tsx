"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { upsertWorkerAction } from "@/features/profile/actions/worker-actions";
import { workerSchema, type WorkerProfileValues } from "@/features/profile/schemas/worker";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export async function profileAction(
  input: WorkerProfileValues,
): Promise<OnboardingStepFormState> {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return onboardingStepError("userNotFound");
  if (user.role !== "worker") return onboardingStepError("userNotAuthorized");

  const { success, data } = workerSchema.safeParse(input);
  if (!success) return onboardingStepError("invalidWorkerData");

  const { error, message } = await upsertWorkerAction(data);
  if (error) return onboardingStepRawError(message);

  const persist = await completeOnboardingStep("personal-details");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return { ok: true, redirectTo: "/onboarding/location", steps: persist.steps };
}
