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

export default async function KycNotFound() {
    const t = await getTranslations("notFound.kyc");

    return (
        <div className="flex w-full justify-center py-8">
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
                        <Link href="/onboarding">{t("backOnboarding")}</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
