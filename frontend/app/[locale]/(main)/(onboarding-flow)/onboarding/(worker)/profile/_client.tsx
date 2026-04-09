"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { WorkerProfileForm } from "@/features/profile/components/worker-profile-form";
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { PhotoUpload } from "@/features/storage/components/photo-upload";
import {
  mapWorkerProfileToFormValues,
  WorkerProfileFormInput,
  WorkerProfileValues,
  workerSchema,
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

  useEffect(() => {
    setPhotoKey(initialPhotoKey);
  }, [initialPhotoKey]);

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
    resolver: zodResolver(workerSchema),
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
              toast.error(result.error);
              return;
            }
            applyStepsFromServer(result.steps);
            router.push(result.redirectTo);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          } finally {
            setIsPending(false);
          }
        })();
      })}
    >
      <WorkerProfileForm form={form} />
      <Field>
        <FieldLabel>Profile photo</FieldLabel>
        <FieldDescription>
          A clear photo of yourself — shown on your profile and in the app header.
        </FieldDescription>
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
