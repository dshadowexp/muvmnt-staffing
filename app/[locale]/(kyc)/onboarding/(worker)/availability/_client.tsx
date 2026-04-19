"use client";

import { useActionState, type ComponentProps } from "react";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import type { WorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import { WorkerAvailabilityScheduleForm } from "@/features/availability/components/worker-availability-schedule-form";
import { availabilityOnboardingAction } from "./_action";
import type { OnboardingStepFormState } from "@/features/onboarding/types";

type Props = { initial: WorkerAvailabilityInitial };

export function AvailabilityOnboardingClient({ initial }: Props) {
  const [state, formAction] = useActionState(
    availabilityOnboardingAction,
    undefined as OnboardingStepFormState | undefined,
  );
  useOnboardingFormNavigate(state);

  return (
    <WorkerAvailabilityScheduleForm
      initial={initial}
      formAction={
        formAction as NonNullable<ComponentProps<"form">["action"]>
      }
      footer={<ContinueButton />}
    />
  );
}
