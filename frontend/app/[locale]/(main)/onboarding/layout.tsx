import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OnboardingProvider } from "@/features/onboarding/onboarding-provider";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { OnboardingDetails } from "@/features/onboarding/components/onboarding-details";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Onboarding | Muvmnt" };

export default async function OnboardingStepsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { role } = session;

  return (
    <OnboardingProvider role={role}>
      <div className="flex min-h-[calc(100dvh-var(--spacing-header))] w-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex w-full items-center justify-between">
            <Logo href="/onboarding" />
            <LogoutButton />
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:items-start">
            <OnboardingProgress />
            <Card className="flex-1 min-w-0 w-full overflow-visible">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <OnboardingDetails />
                  {children}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </OnboardingProvider>
  );
}