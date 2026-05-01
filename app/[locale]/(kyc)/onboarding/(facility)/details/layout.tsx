import { OPERATOR_ROLE } from "@/features/auth/types";
import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function ClientDetailsOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess(OPERATOR_ROLE, "details");
  return <>{children}</>;
}
