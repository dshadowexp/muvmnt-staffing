import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { getLocale } from "next-intl/server";

export default async function WorkerDashboardLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });

    if (session.role !== "worker") return redirect({ href: "/dashboard", locale });

    return <>{children}</>;
}