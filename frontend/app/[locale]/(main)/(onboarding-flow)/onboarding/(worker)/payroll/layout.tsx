import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function WorkerPayrollOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingStepAccess("worker", "payroll");
  return <>{children}</>;
}
