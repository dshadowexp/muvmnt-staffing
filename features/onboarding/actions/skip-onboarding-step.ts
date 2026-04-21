"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import { getOnboardingStepsJson } from "@/features/onboarding/dal/queries";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import { STEPS_BY_ROLE } from "@/features/onboarding/steps";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { canAccessStep } from "@/features/onboarding/types";
import { getSession } from "@/lib/get-session";
import { updateUserIsActive } from "@/features/users/dal/mutations";

const SKIPPABLE_IDS = ["compliance", "billing", "payroll"] as const;
type SkippableStepId = (typeof SKIPPABLE_IDS)[number];

function isSkippableStepId(id: string): id is SkippableStepId {
  return (SKIPPABLE_IDS as readonly string[]).includes(id);
}

/**
 * Marks a skippable onboarding step complete and returns the same redirects as a
 * successful Continue on that step, without step-specific validation (billing /
 * payroll account checks, etc.).
 */
export async function skipOnboardingStepAction(
  _prev: OnboardingStepFormState | undefined,
  formData: FormData,
): Promise<OnboardingStepFormState> {
  const raw = formData.get("stepId");
  const stepId = typeof raw === "string" ? raw.trim() : "";
  if (!isSkippableStepId(stepId)) {
    return onboardingStepError("invalidSubmission");
  }

  const session = await getSession();
  if (!session) return onboardingStepError("userNotAuthenticated");

  const allSteps = STEPS_BY_ROLE[session.role] ?? [];
  const stepDef = allSteps.find((s) => s.id === stepId);
  if (!stepDef?.skippable) {
    return onboardingStepError("skipNotAllowed");
  }

  const completion = await getOnboardingStepsJson(session.userId);
  if (!canAccessStep(stepDef, completion, allSteps)) {
    return onboardingStepError("invalidSubmission");
  }

  switch (stepId) {
    case "compliance": {
      const persist = await completeOnboardingStep("compliance");
      if (persist.error) {
        return persist.message
          ? onboardingStepRawError(persist.message)
          : onboardingStepError("persistFailed");
      }
      return { ok: true, redirectTo: "/onboarding/payroll", steps: persist.steps };
    }
    case "billing": {
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
    }
    case "payroll": {
      const persist = await completeOnboardingStep("payroll", {
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
    default:
      return onboardingStepError("invalidSubmission");
  }
}
