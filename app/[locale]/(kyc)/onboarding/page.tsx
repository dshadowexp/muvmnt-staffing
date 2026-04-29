import {
  getOnboardingCompletionStatus,
  getOnboardingStepsJson,
} from "@/features/onboarding/dal/queries";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import type { UserRole } from "@/features/auth/types";

import { getOnboardingResumeRoute } from "@/features/onboarding/lib/resume-route";

export default async function OnboardingPage() {
  const locale = await getLocale();
  const session = await getSession();

  if (!session) return redirect({ href: "/sign-in", locale });

  const [steps, { is_completed }] = await Promise.all([
    getOnboardingStepsJson(session.userId),
    getOnboardingCompletionStatus(session.userId),
  ]);

  if (is_completed) {
    return redirect({
      href: session.isActive ? `/dashboard` : "/review",
      locale,
    });
  }

  return redirect({ href: getOnboardingResumeRoute(session.role as UserRole, steps), locale });
}
