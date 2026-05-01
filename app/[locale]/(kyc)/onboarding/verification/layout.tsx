import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { requireOnboardingStepAccess } from "@/features/onboarding/server/require-step-access";
import { OPERATOR_ROLE, STAFF_ROLE, type UserRole } from "@/features/auth/types";

export default async function VerificationStepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });

  const role = session.role as UserRole;
  if (role !== STAFF_ROLE && role !== OPERATOR_ROLE) {
    return redirect({ href: "/", locale });
  }

  await requireOnboardingStepAccess(role, "verification");

  return <>{children}</>;
}
