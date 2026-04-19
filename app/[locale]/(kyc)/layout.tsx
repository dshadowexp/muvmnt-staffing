import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/features/auth/components/logout-button";

export default function OnboardingFlowGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--spacing-header))] w-full flex-col px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="mx-auto my-auto w-full max-w-7xl space-y-6">
        <div className="flex w-full shrink-0 items-center justify-between">
          <Logo href="/onboarding" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
