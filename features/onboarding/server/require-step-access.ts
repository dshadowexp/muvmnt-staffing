import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { getOnboardingStepsJson } from "@/features/onboarding/dal/queries";
import { STEPS_BY_ROLE } from "@/features/onboarding/steps";
import {
  canAccessStep,
  getRedirectForIncompleteDependencies,
} from "@/features/onboarding/types";
import type { UserRole } from "@/features/auth/types";

/**
 * Ensures the user may open this onboarding step (dependencies completed in Supabase).
 * Redirects to the first incomplete prerequisite (transitive), in `dependsOn` order.
 */
export async function requireOnboardingStepAccess(
  expectedRole: UserRole,
  stepId: string,
): Promise<void> {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) {
    redirect({ href: "/sign-in", locale });
    return;
  }
  if (session.role !== expectedRole) {
    redirect({ href: "/onboarding", locale });
    return;
  }

  const steps = STEPS_BY_ROLE[expectedRole] ?? [];
  const step = steps.find((s) => s.id === stepId);
  if (!step) return;

  const completion = await getOnboardingStepsJson(session.userId);
  if (canAccessStep(step, completion, steps)) return;

  const href = getRedirectForIncompleteDependencies(step, completion, steps, session.role);
  redirect({ href, locale });
}
