import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/get-session";

function dashboardHomeHref(role: string | undefined): string {
    if (role === "admin") return "/admin";
    if (role === "client") return "/client";
    if (role === "worker") return "/worker";
    return "/";
}

export default async function DashboardNotFound() {
    const t = await getTranslations("notFound.dashboard");
    const session = await getSession();
    const href = dashboardHomeHref(session?.role);

    return (
        <div className="flex min-h-[min(60vh,32rem)] w-full flex-1 items-center justify-center py-12">
            <Card
                size="sm"
                className="w-full max-w-md border-dashed text-center shadow-none"
            >
                <CardHeader className="text-center">
                    <CardTitle className="text-xl font-semibold tracking-tight">
                        {t("title")}
                    </CardTitle>
                    <CardDescription>{t("description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="default" className="w-full">
                        <Link href={href}>{t("backDashboard")}</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
