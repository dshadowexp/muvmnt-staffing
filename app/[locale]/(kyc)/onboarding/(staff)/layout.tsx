import { getSession } from "@/lib/get-session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { STAFF_ROLE } from "@/features/auth/types";

export default async function StaffOnboardingLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });

    if (session.role !== STAFF_ROLE) return redirect({ href: "/onboarding", locale });

    return <>{children}</>;
}