import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { getLocale } from "next-intl/server";
import ClientHomePage from "./(client)/_page";
import WorkerHomePage from "./(worker)/_page";

export default async function DashboardPage() {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });
    if (session.role === "client") return <ClientHomePage />;
    if (session.role === "worker") return <WorkerHomePage />;
    return redirect({ href: "/dashboard/admin", locale });
}