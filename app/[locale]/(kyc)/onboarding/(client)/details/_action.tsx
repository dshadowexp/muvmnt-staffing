"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { createFacilityAction } from "@/features/account/actions";
import { clientSchema, type ClientProfileValues } from "@/features/account/schemas/client";
import { getSession } from "@/lib/get-session";

export async function detailsAction(
  input: ClientProfileValues,
): Promise<OnboardingStepFormState> {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  if (session.role !== "client") return onboardingStepError("userNotAuthorized");

  // ── 1. Validate ───────────────────────────────────────────────────────────
  const { success, data } = clientSchema.safeParse(input);
  if (!success) return onboardingStepError("invalidClientData");

  // ── 2. Save facility + address in one call ────────────────────────────────
  const { error, message } = await createFacilityAction(data);
  if (error) return onboardingStepRawError(message);

  // ── 3. Mark step complete ─────────────────────────────────────────────────
  const persist = await completeOnboardingStep("details");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return { ok: true, redirectTo: "/onboarding/billing", steps: persist.steps };
}
