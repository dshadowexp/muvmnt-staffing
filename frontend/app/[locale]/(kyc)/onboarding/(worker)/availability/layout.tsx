import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerAvailabilityOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("worker", "availability");
  return <>{children}</>;
}
