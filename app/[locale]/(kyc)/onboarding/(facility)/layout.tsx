import { getSession } from "@/lib/get-session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isFacilityOperatorRole } from "@/features/auth/lib/facility-operator-role";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });

    if (!isFacilityOperatorRole(session.role)) return redirect({ href: "/onboarding", locale });

    return <>{children}</>;
}