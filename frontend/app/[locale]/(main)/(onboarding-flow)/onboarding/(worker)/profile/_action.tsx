"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { upsertWorkerAction } from "@/features/profile/actions/worker-actions";
import { workerSchema, type WorkerProfileValues } from "@/features/profile/schemas/worker";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export async function profileAction(
  input: WorkerProfileValues,
): Promise<OnboardingStepFormState> {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };
  if (user.role !== "worker") return { ok: false, error: "User is not authorized" };

  const { success, data } = workerSchema.safeParse(input);
  if (!success) return { ok: false, error: "Invalid worker data" };

  const { error, message } = await upsertWorkerAction(data);
  if (error) return { ok: false, error: message };

  const persist = await completeOnboardingStep("personal-details");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  return { ok: true, redirectTo: "/onboarding/location", steps: persist.steps };
}