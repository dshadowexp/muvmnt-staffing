import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getOnboardingCompletionStatus } from "@/features/onboarding/dal/queries";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Application status | Muvmnt" };

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) {
    redirect({ href: "/sign-in", locale });
    return;
  }
  if (session.role !== "worker") {
    redirect({ href: "/app", locale });
    return;
  }

  const { is_completed } = await getOnboardingCompletionStatus(session.userId);
  if (!is_completed) {
    redirect({ href: "/onboarding/payroll", locale });
    return;
  }

  return (
    <Card className="w-full overflow-visible">
      <CardContent className="pt-6">
        <div className="space-y-6">{children}</div>
      </CardContent>
    </Card>
  );
}
