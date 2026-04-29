import { Link, redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getLocale } from "next-intl/server";
import ClientHomePage from "./(client)/_page";
import WorkerHomePage from "./(worker)/_page";

export default async function DashboardPage() {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });
    if (session.role === "client") return <ClientHomePage />;
    if (session.role === "worker") return <WorkerHomePage />;
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1>Ops! You shouldn't be here</h1>
            <p>You are not authorized to access this page.</p>
            <Link href="/">Go to home</Link>
        </div>
    );
}