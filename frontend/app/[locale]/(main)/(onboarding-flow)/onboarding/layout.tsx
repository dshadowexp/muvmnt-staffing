import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { getOnboardingStepsJson } from "@/features/onboarding/dal/queries";
import { OnboardingProvider } from "@/features/onboarding/onboarding-provider";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { Card, CardContent } from "@/components/ui/card";
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

  const { role, userId } = session;
  const stepCompletion = await getOnboardingStepsJson(userId);

  return (
    <OnboardingProvider role={role} initialStepCompletion={stepCompletion}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <OnboardingProgress />
        <Card className="min-w-0 w-full flex-1 overflow-visible">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <OnboardingDetails />
              {children}
            </div>
          </CardContent>
        </Card>
      </div>
    </OnboardingProvider>
  );
}