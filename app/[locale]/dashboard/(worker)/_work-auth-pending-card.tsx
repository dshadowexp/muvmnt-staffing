"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PencilIcon, ShieldCheckIcon } from "lucide-react";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import type { WorkerAuthorizationFormHandle } from "@/features/profile/components/worker-authorization-form";
import { upsertWorkAuthorizationAction } from "@/features/profile/actions/authorization-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import type { WorkAuthData } from "@/features/profile/components/worker-account-profile";

type Props = {
  workAuth: WorkAuthData;
};

export function WorkAuthPendingCard({ workAuth }: Props) {
  const t = useTranslations("dashboard.worker.home.workAuthorization");
  const router = useRouter();
  const formRef = useRef<WorkerAuthorizationFormHandle>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isVerified = workAuth?.is_verified === true;
  if (isVerified) return null;

  const hasPendingReview =
    !isVerified &&
    workAuth !== null &&
    (workAuth.social_number || workAuth.file_url);

  const description = hasPendingReview
    ? t("descriptionPendingReview")
    : t("description");

  async function handleSave() {
    if (!formRef.current) return;
    const values = await formRef.current.prepareForContinue();
    if (!values) return;

    setIsSaving(true);
    try {
      const { error, message } = await upsertWorkAuthorizationAction({
        type: values.type,
        socialNumber: values.socialNumber,
        socialNumberExpiry: values.socialNumberExpiry ?? null,
        fileUrl: workAuth?.file_url ?? null,
      });
      if (error) {
        toast.error(message);
      } else {
        toast.success(t("savedSuccess"));
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted p-2 mt-0.5">
            <ShieldCheckIcon className="size-5 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setIsEditing(true)}
            aria-label={t("editAria")}
            title={t("editAria")}
          >
            <PencilIcon className="size-4" />
          </Button>
        )}
      </CardHeader>
      {isEditing && (
        <CardContent className="flex flex-col gap-4">
          <WorkerAuthorizationForm
            ref={formRef}
            initialWorkAuthorization={
              workAuth
                ? {
                    type: workAuth.type,
                    file_url: workAuth.file_url,
                    social_number: workAuth.social_number,
                    social_number_expiry: workAuth.social_number_expiry,
                  }
                : null
            }
            workAuthorizationVerified={false}
            profileEditMode={false}
            submitting={isSaving}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? t("saving") : t("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
