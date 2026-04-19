import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";

export default async function LocationOnboardingLayout({
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
  const role = session.role;
  if (role !== "worker" && role !== "client") {
    redirect({ href: "/onboarding", locale });
    return;
  }

  await requireOnboardingStepAccess(role, "location");

  return <>{children}</>;
}
