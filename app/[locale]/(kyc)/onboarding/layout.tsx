import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { getOnboardingStepsJson } from "@/features/onboarding/dal/queries";
import { OnboardingProvider } from "@/features/onboarding/onboarding-provider";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingDetails } from "@/features/onboarding/components/onboarding-details";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kyc.onboarding.meta" });
  return { title: t("title") };
}

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
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-10">
        <OnboardingProgress />
        <Card className="min-w-0 w-full flex-1 overflow-visible">
          <CardContent className="px-5 pt-2 sm:px-6 md:px-8">
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
