import { OPERATOR_ROLE } from "@/features/auth/types";
import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function ClientBillingOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess(OPERATOR_ROLE, "billing");
  return <>{children}</>;
}
