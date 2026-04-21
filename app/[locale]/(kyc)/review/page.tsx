import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { getOnboardingCompletionStatus } from "@/features/onboarding/dal/queries";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import ReviewClient from "./_client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kyc.review.meta" });
  return { title: t("title") };
}

export default async function ReviewPage() {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });

  const { is_completed } = await getOnboardingCompletionStatus(session.userId);
  if (!is_completed) {
    return redirect({ href: "/onboarding", locale });
  }

  return (
    <Card className="w-full overflow-visible">
      <CardContent className="pt-6">
        <div className="space-y-6">
        <ReviewClient />
        </div>
      </CardContent>
    </Card>
  );

}
