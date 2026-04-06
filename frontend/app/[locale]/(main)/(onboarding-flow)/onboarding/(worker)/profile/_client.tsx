"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { WorkerProfileForm } from "@/features/profile/components/worker-profile-form";
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

export function ProfileClient({ workerProfile }: { workerProfile: WorkerProfileFormInput | null }) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const [isPending, setIsPending] = useState(false);
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
      <ContinueButton pending={isPending} />
    </form>
  );
}
