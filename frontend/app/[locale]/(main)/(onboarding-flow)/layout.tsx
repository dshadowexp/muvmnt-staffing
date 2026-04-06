import { Logo } from "@/components/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";

export default function OnboardingFlowGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--spacing-header))] w-full flex-col px-4 py-8 md:py-12">
      <div className="mx-auto my-auto w-full max-w-2xl space-y-6">
        <div className="flex w-full shrink-0 items-center justify-between">
          <Logo href="/onboarding" />
          <LogoutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
