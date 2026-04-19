"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslatedStepError } from "@/features/onboarding/lib/use-translated-step-error";

/** After a Continue server action returns merged steps + redirect, update context then navigate. */
export function useOnboardingFormNavigate(state: OnboardingStepFormState | undefined) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const resolveError = useTranslatedStepError();

  useEffect(() => {
    if (!state) return;
    if (!state.ok) {
      toast.error(resolveError(state));
      return;
    }
    applyStepsFromServer(state.steps);
    router.push(state.redirectTo);
  }, [state, applyStepsFromServer, router, resolveError]);
}
