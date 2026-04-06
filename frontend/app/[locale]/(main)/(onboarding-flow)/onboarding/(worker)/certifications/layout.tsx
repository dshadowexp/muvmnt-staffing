import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerCertificationsOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("worker", "certifications");
  return <>{children}</>;
}
