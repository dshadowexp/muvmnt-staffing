import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/sign-in");

    if (session.role !== "client") redirect("/onboarding");

    return <>{children}</>;
}