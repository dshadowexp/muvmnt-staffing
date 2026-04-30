"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { PhotoUploadStep, type SavePhotoResult } from "./_photo-upload";

export function PhotoStepClient({
  interviewId: _interviewId,
  title,
  subtitle,
  initialPhotoKey,
  nextHref,
  onSavePhoto,
}: {
  interviewId: string;
  title: string;
  subtitle: string;
  initialPhotoKey?: string;
  backHref: string;
  nextHref: string;
  onSavePhoto: (key: string) => Promise<SavePhotoResult>;
}) {
  const router = useRouter();
  const t = useTranslations("assessments.interview.photoStep");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-6 md:pt-8">
      <header className="mb-10 flex flex-col items-center space-y-3 text-center">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
          {t("badge")}
        </Badge>
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
      </header>

      <PhotoUploadStep
        variant="split"
        initialPhotoKey={initialPhotoKey}
        onSavePhoto={onSavePhoto}
        descriptionOverride={subtitle}
        continueLabelOverride={t("continue")}
        onComplete={() => {
          router.push(nextHref);
        }}
      />
    </div>
  );
}
