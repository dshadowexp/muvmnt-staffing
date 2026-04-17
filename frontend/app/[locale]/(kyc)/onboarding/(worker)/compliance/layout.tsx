import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerComplianceOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("worker", "compliance");
  return <>{children}</>;
}
