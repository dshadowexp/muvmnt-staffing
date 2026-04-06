import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerProfileOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("worker", "personal-details");
  return <>{children}</>;
}
