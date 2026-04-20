import type { UserRole } from "@/types/auth";
import { STEPS_BY_ROLE } from "@/features/onboarding/steps";
import type { OnboardingStepsJson } from "@/features/onboarding/types";
import { getOnboardingBlockerRoute } from "@/features/onboarding/types";

/**
 * Path for the user's current onboarding work: first incomplete step in role order,
 * or the route of an unsatisfied prerequisite (same rules as step access).
 */
export function getOnboardingResumeRoute(
  role: UserRole,
  completion: OnboardingStepsJson,
): string {
  const allSteps = STEPS_BY_ROLE[role];
  if (!allSteps.length) return `/${role}`;

  for (const step of allSteps) {
    if (completion[step.id]?.completed === true) continue;
    const blocker = getOnboardingBlockerRoute(step, completion, allSteps);
    if (blocker) return blocker;
    return step.route;
  }

  return allSteps[allSteps.length - 1]!.route;
}
