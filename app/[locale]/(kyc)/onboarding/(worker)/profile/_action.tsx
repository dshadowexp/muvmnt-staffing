"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { upsertWorkerAction } from "@/features/profile/actions/worker-actions";
import {
  workerUpsertWithPhotoSchema,
  type WorkerUpsertWithPhotoValues,
} from "@/features/profile/schemas/worker";
import { getSession } from "@/lib/session";

export async function profileAction(
  input: WorkerUpsertWithPhotoValues,
): Promise<OnboardingStepFormState> {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  if (session.role !== "worker") return onboardingStepError("userNotAuthorized");

  const { success, data } = workerUpsertWithPhotoSchema.safeParse(input);
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
