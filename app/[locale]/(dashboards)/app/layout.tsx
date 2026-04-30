import { OPERATOR_ROLE } from "@/features/auth/types";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getLocale } from "next-intl/server";

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();

    if (session?.role !== OPERATOR_ROLE) return redirect({ href: "/dashboard", locale });

    return <>{children}</>;
}