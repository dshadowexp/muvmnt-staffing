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

export function ProfileClient({
  workerProfile,
  initialPhotoKey,
}: {
  workerProfile: WorkerProfileFormInput | null;
  initialPhotoKey: string | null;
}) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const [isPending, setIsPending] = useState(false);
  const [photoKey, setPhotoKey] = useState<string | null>(initialPhotoKey);

  const tForm = useTranslations("kyc.onboarding.forms.workerProfile");
  const tVal = useTranslations("kyc.onboarding.validation");
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

  function handlePhotoUploaded(file: { key?: string }) {
    if (!file.key) return;
    setPhotoKey(file.key);
    updateWorkerPhotoAction(file.key).then(({ error, message }) => {
      if (error) toast.error(message);
      else toast.success(message);
    });
  }

  async function handlePhotoRemoved() {
    setPhotoKey(null);
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
            const result = await profileAction(data);
            if (!result.ok) {
              toast.error(resolveError(result));
              return;
            }
            applyStepsFromServer(result.steps);
            router.push(result.redirectTo);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : resolveError({ ok: false, error: "Something went wrong", errorKey: "somethingWentWrong" }));
          } finally {
            setIsPending(false);
          }
        })();
      })}
    >
      <WorkerProfileForm form={form} />
      <Field>
        <FieldLabel>{tForm("photoLabel")}</FieldLabel>
        <FieldDescription>{tForm("photoDescription")}</FieldDescription>
        <PhotoUpload
          context="avatars"
          initialFileKey={photoKey ?? undefined}
          onUploaded={handlePhotoUploaded}
          onFileChange={(hasFile) => {
            if (!hasFile) void handlePhotoRemoved();
          }}
        />
      </Field>
      <ContinueButton pending={isPending} />
    </form>
  );
}
