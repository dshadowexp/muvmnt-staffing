import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerAuthorizationOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("worker", "authorization");
  return <>{children}</>;
}
