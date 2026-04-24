"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslatedStepError } from "@/features/onboarding/lib/use-translated-step-error";
import { WorkerProfileForm } from "@/features/profile/components/worker-profile-form";
import {
  buildWorkerSchema,
  mapWorkerProfileToFormValues,
  WorkerProfileFormInput,
  WorkerProfileValues,
  type WorkerGender,
} from "@/features/profile/schemas/worker";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { profileAction } from "./_action";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import posthog from "posthog-js";
import { ProfessionalRole } from "@/lib/professions";

export function ProfileClient({
  workerProfile,
}: {
  workerProfile: WorkerProfileFormInput | null;
}) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const { loading: authLoading } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const formLocked = isPending || authLoading;

  const tVal = useTranslations("kyc.onboarding.validation");
  const resolveError = useTranslatedStepError();

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
            posthog.capture("onboarding_profile_completed", {
              profession: data.profession,
              years_exp: data.yearsExp,
            });
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
      <WorkerProfileForm form={form} disabled={formLocked} />
      <ContinueButton pending={isPending} />
    </form>
  );
}
