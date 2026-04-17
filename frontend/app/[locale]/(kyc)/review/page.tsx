import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kyc.review.meta" });
  return { title: t("title") };
}

export default async function WorkerOnboardingReviewPage() {
  const t = await getTranslations("kyc.review");
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 px-4 py-5 sm:flex-row sm:items-start">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardCheck className="size-6" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-medium text-foreground">{t("title")}</p>
          <p className="text-muted-foreground">
            {t("bodyPrefix")}{" "}
            <span className="font-medium text-foreground">
              {t("bodyHighlight")}
            </span>
            {t("bodySuffix")}
          </p>
        </div>
      </div>
      <Alert>
        <AlertTitle>{t("nextTitle")}</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          {t("nextBody")}
        </AlertDescription>
      </Alert>
    </div>
  );
}
