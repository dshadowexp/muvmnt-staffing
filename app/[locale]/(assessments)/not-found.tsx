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

export default async function AssessmentsNotFound() {
    const t = await getTranslations("notFound.assessments");

    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-background px-4 py-16">
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
                        <Link href="/worker/assessments">
                            {t("backAssessments")}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
