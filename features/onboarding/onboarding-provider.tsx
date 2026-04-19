"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMultistepForm, type MultistepFormStep } from "@/hooks/use-multistep-form";
import type { UserRole } from "@/types/auth";
import { STEPS_BY_ROLE } from "./steps";
import type { OnboardingStepsJson } from "./types";

// ─── Context ────────────────────────────────────────────────────────────────

export interface OnboardingContextValue {
  currentStepIndex: number;
  step: MultistepFormStep | undefined;
  steps: MultistepFormStep[];
  isFirstStep: boolean;
  isLastStep: boolean;
  goTo: (index: number) => void;
  next: () => void;
  back: () => void;
  role: UserRole;
  /** Supabase `onboarding.steps` completion map (keys = step ids). */
  stepCompletion: OnboardingStepsJson;
  /** Apply merged steps from the server after a successful `completeOnboardingStep`. */
  applyStepsFromServer: (steps: OnboardingStepsJson) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

// ─── Provider ────────────────────────────────────────────────────────────────

interface OnboardingProviderProps {
  children: ReactNode;
  role: UserRole;
  /** Initial completion from server (e.g. layout). */
  initialStepCompletion?: OnboardingStepsJson;
}

export function OnboardingProvider({
  children,
  role,
  initialStepCompletion = {},
}: OnboardingProviderProps) {
  const [stepCompletion, setStepCompletion] = useState(initialStepCompletion);

  useEffect(() => {
    setStepCompletion(initialStepCompletion);
  }, [initialStepCompletion]);

  const applyStepsFromServer = useCallback((steps: OnboardingStepsJson) => {
    setStepCompletion(steps);
  }, []);

  const steps = useMemo(
    () => STEPS_BY_ROLE[role] ?? [],
    [role]
  );

  const multistep = useMultistepForm(steps);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ...multistep,
      step: multistep.steps[multistep.currentStepIndex],
      role,
      stepCompletion,
      applyStepsFromServer,
    }),
    [multistep, role, stepCompletion, applyStepsFromServer]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
