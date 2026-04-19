import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function ClientBillingOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("client", "billing");
  return <>{children}</>;
}
