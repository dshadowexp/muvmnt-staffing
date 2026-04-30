import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getLocale } from "next-intl/server";
import { STAFF_ROLE } from "@/features/auth/types";

export default async function WorkerDashboardLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();

    if (session?.role !== STAFF_ROLE) return redirect({ href: "/dashboard", locale });

    return <>{children}</>;
}