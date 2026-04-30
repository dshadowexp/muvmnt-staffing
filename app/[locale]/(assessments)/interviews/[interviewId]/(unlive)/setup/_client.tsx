"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { InterviewInstructionsCard } from "../../../_components/interview-instructions-card";
import { DeviceSetupCard } from "../../../_components/device-setup-card";

export function SetupClient({
  interviewId,
  title,
  description,
  durationMins,
  allowedLocales,
  savedLocale,
  isResuming,
}: {
  interviewId: string;
  title: string;
  description: string;
  durationMins: number;
  allowedLocales: readonly string[];
  savedLocale?: string;
  isResuming: boolean;
}) {
  const router = useRouter();
  const currentLocale = useLocale();

  const effectiveLocales = allowedLocales.length > 0 ? allowedLocales : routing.locales;
  const initialLocale = useMemo(() => {
    if (savedLocale && effectiveLocales.includes(savedLocale)) return savedLocale;
    if (effectiveLocales.includes(currentLocale)) return currentLocale;
    return effectiveLocales[0] ?? "en";
  }, [savedLocale, effectiveLocales, currentLocale]);

  const [selectedLocale, setSelectedLocale] = useState<string>(initialLocale);
  const t = useTranslations("assessments.interview.setupStep");

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-6 md:pt-8">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
            {t("badge")}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="mx-auto grid h-fit w-full max-w-lg grid-cols-1 gap-6 lg:max-w-5xl lg:grid-cols-2">
          <InterviewInstructionsCard
            title={title}
            description={description}
            durationMins={durationMins}
          />
          <DeviceSetupCard
            isResuming={isResuming}
            savedLocale={savedLocale}
            allowedLocales={effectiveLocales}
            selectedLocale={selectedLocale}
            onLocaleChange={setSelectedLocale}
            onStart={async () => {
              router.push(`/interviews/${interviewId}/live?lang=${encodeURIComponent(selectedLocale)}`);
            }}
          />
        </div>
      </div>
    </main>
  );
}

