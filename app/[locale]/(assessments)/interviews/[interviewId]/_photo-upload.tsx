"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CameraIcon, CircleDashedIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhotoUpload } from "@/features/storage/components/photo-upload";
import { deleteFile } from "@/features/storage/dal/mutations";
import { InterviewHeader } from "../_components/interview-header";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";

export type SavePhotoResult = { error: true; message: string } | { error: false };

type Props = {
  initialPhotoKey?: string;
  /** Where the header back-link points. Defaults to /dashboard for workers. */
  backHref?: string;
  /**
   * Persists the uploaded S3 key to the appropriate record.
   * Workers: updateWorkerPhotoAction
   * Candidates: saveCandidatePhotoAction (bound to screeningId)
   */
  onSavePhoto: (key: string) => Promise<SavePhotoResult>;
  onComplete: (photoUrl: string) => void;
};

export function PhotoUploadStep({
  initialPhotoKey,
  backHref = "/dashboard",
  onSavePhoto,
  onComplete,
}: Props) {
  const t = useTranslations("assessments.interview.photo");
  const [hasExisting, setHasExisting] = useState(!!initialPhotoKey);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleContinue() {
    setIsSaving(true);

    // New upload — persist it, then resolve a display URL
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

    // Existing photo — resolve URL, no write needed
    if (initialPhotoKey) {
      const { url } = await getPresignedDownloadUrl(initialPhotoKey);
      setIsSaving(false);
      onComplete(url);
      return;
    }

    setIsSaving(false);
  }

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden p-4">
      <InterviewHeader backHref={backHref} backTitle={t("backTitle")} />

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-muted p-2">
                <CameraIcon className="size-5 text-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-xl">{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6">
            <PhotoUpload
              context="avatars"
              initialFileKey={initialPhotoKey}
              disabled={isSaving}
              className="items-center"
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

            <Button
              size="lg"
              className="w-full"
              disabled={(!pendingKey && !hasExisting) || isSaving}
              onClick={handleContinue}
            >
              {isSaving && (
                <CircleDashedIcon className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              {t("continue")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
