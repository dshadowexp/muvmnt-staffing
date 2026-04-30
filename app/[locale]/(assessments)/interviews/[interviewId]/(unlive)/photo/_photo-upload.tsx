"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CircleDashedIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  ScanFaceIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/features/storage/components/photo-upload";
import { deleteFile } from "@/features/storage/dal/mutations";
import { InterviewHeader } from "../../../_components/interview-header";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";

export type SavePhotoResult = { error: true; message: string } | { error: false };

type Props = {
  initialPhotoKey?: string;
  backHref?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  continueLabelOverride?: string;
  onSavePhoto: (key: string) => Promise<SavePhotoResult>;
  onComplete: (photoUrl: string) => void;
  variant?: "standalone" | "split";
};

const TIPS = [
  { icon: ScanFaceIcon,    key: "tipFace" as const },
  { icon: ImageIcon,       key: "tipLight" as const },
  { icon: CheckCircle2Icon, key: "tipClear" as const },
  { icon: ShieldCheckIcon, key: "tipId" as const },
] as const;

const FALLBACK_TIPS = [
  "Face clearly visible and centred",
  "Good lighting, no harsh shadows",
  "Recent, clear photo of yourself",
  "Used for identity verification only",
];

export function PhotoUploadStep({
  initialPhotoKey,
  backHref = "/dashboard",
  onSavePhoto,
  onComplete,
  titleOverride,
  descriptionOverride,
  continueLabelOverride,
  variant = "standalone",
}: Props) {
  const t = useTranslations("assessments.interview.photo");
  const [hasExisting, setHasExisting] = useState(!!initialPhotoKey);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleContinue() {
    setIsSaving(true);

    if (pendingKey) {
      const result = await onSavePhoto(pendingKey);
      if (result.error) {
        setIsSaving(false);
        toast.error(result.message);
        await deleteFile(pendingKey).catch(() => undefined);
        setPendingKey(null);
        return;
      }
      const { url } = await getPresignedDownloadUrl(pendingKey);
      setIsSaving(false);
      onComplete(url);
      return;
    }

    if (initialPhotoKey) {
      const { url } = await getPresignedDownloadUrl(initialPhotoKey);
      setIsSaving(false);
      onComplete(url);
      return;
    }

    setIsSaving(false);
  }

  const cta = continueLabelOverride ?? t("continue");

  const upload = (
    <PhotoUpload
      context="avatars"
      initialFileKey={initialPhotoKey}
      disabled={isSaving}
      className="w-full items-center"
      onUploaded={({ key }) => {
        if (key) {
          setPendingKey(key);
          setHasExisting(false);
        }
      }}
      onFileChange={(hasFile) => {
        if (!hasFile) {
          setPendingKey(null);
          setHasExisting(false);
        }
      }}
    />
  );

  const canContinue = (pendingKey || hasExisting) && !isSaving;

  if (variant === "split") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        {/* Upload area — large, centered, prominent */}
        <div className="flex flex-col items-center gap-8">

          {/* Photo upload box — bigger in split context */}
          <div className="w-full max-w-xs">
            {upload}
          </div>

          {/* Tips — horizontal row of pills */}
          <div className="flex w-full flex-wrap justify-center gap-2">
            {FALLBACK_TIPS.map((tip, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5"
              >
                <CheckCircle2Icon className="size-3 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">{tip}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full max-w-xs"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            {isSaving && (
              <CircleDashedIcon className="mr-2 size-4 animate-spin" aria-hidden />
            )}
            {cta}
          </Button>
        </div>
      </div>
    );
  }

  // ── Standalone variant ────────────────────────────────────────────────────

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden">
      <InterviewHeader backHref={backHref} backTitle={t("backTitle")} />

      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">

        {/* Upload */}
        <div className="w-full max-w-xs">
          {upload}
        </div>

        {/* Tips */}
        <div className="flex w-full max-w-sm flex-col gap-2">
          {FALLBACK_TIPS.map((tip, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
              {tip}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full max-w-xs"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {isSaving && (
            <CircleDashedIcon className="mr-2 size-4 animate-spin" aria-hidden />
          )}
          {cta}
        </Button>
      </main>
    </div>
  );
}