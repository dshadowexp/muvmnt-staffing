"use server";

import { saveWorkerAvailabilityBundle } from "@/features/availability/dal/mutations";
import { availabilityOnboardingPayloadSchema } from "@/features/availability/schema";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";

export async function availabilityOnboardingAction(
  _prevState: OnboardingStepFormState | undefined,
  formData: FormData,
): Promise<OnboardingStepFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return onboardingStepError("invalidSubmission");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch {
    return onboardingStepError("invalidSubmission");
  }

  const parsed = availabilityOnboardingPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    // Schema messages are translation keys under `kyc.onboarding.validation`.
    const issue = parsed.error.issues[0];
    if (issue?.message) {
      return {
        ok: false,
        error: issue.message,
        errorKey: `validation.${issue.message}`,
      };
    }
    return onboardingStepError("availabilityCheck");
  }

  const saved = await saveWorkerAvailabilityBundle(parsed.data);
  if (saved.error) {
    return onboardingStepRawError(saved.message);
  }

  const persist = await completeOnboardingStep("availability");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return {
    ok: true,
    redirectTo: "/onboarding/compliance",
    steps: persist.steps,
  };
}
