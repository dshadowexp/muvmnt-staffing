import { STAFF_ROLE } from "@/features/auth/types";
import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerProfileOnboardingLayout({
children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess(STAFF_ROLE, "personal-details");
  return <>{children}</>;
}
