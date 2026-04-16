import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function ClientDetailsOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("client", "details");
  return <>{children}</>;
}
