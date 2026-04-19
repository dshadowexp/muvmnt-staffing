"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslatedStepError } from "@/features/onboarding/lib/use-translated-step-error";
import { WorkerProfileForm } from "@/features/profile/components/worker-profile-form";
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { PhotoUpload } from "@/features/storage/components/photo-upload";
import { uploadFileToStorage } from "@/features/storage/components/file-input";
import {
  buildWorkerSchema,
  mapWorkerProfileToFormValues,
  WorkerProfileFormInput,
  WorkerProfileValues,
  type WorkerGender,
} from "@/features/profile/schemas/worker";
import { ProfessionalRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { profileAction } from "./_action";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import posthog from "posthog-js";

export function ProfileClient({
  workerProfile,
  initialPhotoKey,
}: {
  workerProfile: WorkerProfileFormInput | null;
  initialPhotoKey: string | null;
}) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const { loading: authLoading } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const formLocked = isPending || authLoading;
  const [photoKey, setPhotoKey] = useState<string | null>(initialPhotoKey);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const tForm = useTranslations("kyc.onboarding.forms.workerProfile");
  const tVal = useTranslations("kyc.onboarding.validation");
  const tErrors = useTranslations("kyc.onboarding.errors");
  const resolveError = useTranslatedStepError();

  useEffect(() => {
    setPhotoKey(initialPhotoKey);
  }, [initialPhotoKey]);

  const schema = useMemo(() => buildWorkerSchema(tVal), [tVal]);

  const form = useForm<WorkerProfileValues>({
    defaultValues: workerProfile
      ? mapWorkerProfileToFormValues(workerProfile)
      : {
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "" as WorkerGender,
          profession: "" as ProfessionalRole,
          yearsExp: 0,
        },
    resolver: zodResolver(schema),
  });

  async function handlePhotoRemoved() {
    setPhotoKey(null);
    setPendingFile(null);
    const { error, message } = await updateWorkerPhotoAction("");
    if (error) toast.error(message);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((data) => {
        void (async () => {
          setIsPending(true);
          try {
            let photoUrl = photoKey?.trim() ?? "";
            if (pendingFile) {
              try {
                const { key } = await uploadFileToStorage({
                  file: pendingFile,
                  context: "avatars",
                });
                photoUrl = key;
              } catch {
                toast.error(tForm("photoUploadFailed"));
                return;
              }
            }

            if (!photoUrl) {
              toast.error(tErrors("photoMissing"));
              return;
            }

            const result = await profileAction({ ...data, photoUrl });
            if (!result.ok) {
              toast.error(resolveError(result));
              return;
            }
            posthog.capture("onboarding_profile_completed", {
              profession: data.profession,
              years_exp: data.yearsExp,
            });
            setPendingFile(null);
            setPhotoKey(photoUrl);
            applyStepsFromServer(result.steps);
            router.push(result.redirectTo);
          } catch (e) {
            posthog.captureException(e);
            toast.error(
              e instanceof Error
                ? e.message
                : resolveError({
                    ok: false,
                    error: "Something went wrong",
                    errorKey: "somethingWentWrong",
                  }),
            );
          } finally {
            setIsPending(false);
          }
        })();
      })}
    >
      <Field>
        <FieldLabel>{tForm("photoLabel")}</FieldLabel>
        <FieldDescription>{tForm("photoDescription")}</FieldDescription>
        <PhotoUpload
          context="avatars"
          initialFileKey={photoKey ?? undefined}
          deferredUpload
          deferredPendingHint={tForm("photoSelectedHint")}
          disabled={formLocked}
          onPendingFileChange={setPendingFile}
          onFileChange={(hasFile) => {
            if (!hasFile) void handlePhotoRemoved();
          }}
        />
      </Field>
      <WorkerProfileForm form={form} disabled={formLocked} />
      <ContinueButton pending={isPending} />
    </form>
  );
}
