"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { upsertWorkerAction } from "@/features/profile/actions/worker-actions";
import { workerSchema, type WorkerProfileValues } from "@/features/profile/schemas/worker";
import { getSession } from "@/lib/get-session";
import { updateUserIsActive } from "@/features/users/dal/mutations";
import { STAFF_ROLE } from "@/features/auth/types";

export async function profileAction(
  input: WorkerProfileValues,
): Promise<OnboardingStepFormState> {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  if (session.role !== STAFF_ROLE) return onboardingStepError("userNotAuthorized");

  // ── 1. Validate ───────────────────────────────────────────────────────────
  const { success, data } = workerSchema.safeParse(input);
  if (!success) return onboardingStepError("invalidWorkerData");

  // ── 2. Save worker profile + address in one call ──────────────────────────
  const { error, message } = await upsertWorkerAction(data);
  if (error) return onboardingStepRawError(message);

  // ── 3. Mark step complete + finish onboarding ─────────────────────────────
  const persist = await completeOnboardingStep("personal-details", {
    markOnboardingCompleted: true,
  });
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  await updateUserIsActive(session.userId, true);

  return { ok: true, redirectTo: "/review", steps: persist.steps };
}
