import { getSession } from "@/lib/get-session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const session = await getSession();
    if (!session) return redirect({ href: "/sign-in", locale });

    if (session.role !== "client") return redirect({ href: "/onboarding", locale });

    return <>{children}</>;
}