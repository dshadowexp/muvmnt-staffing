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

export default async function DashboardNotFound() {
    const t = await getTranslations("notFound.dashboard");

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
                        <Link href="/app">{t("backDashboard")}</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
