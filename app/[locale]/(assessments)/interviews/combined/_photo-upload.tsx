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
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import { InterviewHeader } from "../_components/interview-header";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";

type Props = {
    initialPhotoKey?: string;
    onComplete: (photoUrl: string) => void;
};

export function PhotoUploadStep({ initialPhotoKey, onComplete }: Props) {
  const t = useTranslations("assessments.interview.photo");
  const [hasExisting, setHasExisting] = useState(!!initialPhotoKey);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleContinue() {
    setIsSaving(true);
  
    // User uploaded a new photo — save it to the DB then resolve its URL
    if (pendingKey) {
      const { error, message } = await updateWorkerPhotoAction(pendingKey);
      if (error) {
        setIsSaving(false);
        toast.error(message);
        await deleteFile(pendingKey).catch(() => undefined);
        setPendingKey(null);
        return;
      }
      const { url } = await getPresignedDownloadUrl(pendingKey);
      setIsSaving(false);
      onComplete(url);
      return;
    }
  
    // User kept their existing photo — just resolve its URL, no DB write needed
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
      <InterviewHeader
        backHref="/dashboard"
        backTitle={t("backTitle")}
      />

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
                    setHasExisting(false); // new upload replaces existing
                    }
                }}
                onFileChange={(hasFile) => {
                    if (!hasFile) {
                    setPendingKey(null);
                    setHasExisting(false); // user removed the photo entirely
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