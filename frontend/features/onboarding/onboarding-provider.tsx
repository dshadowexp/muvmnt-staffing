"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useMultistepForm, type MultistepFormStep } from "@/hooks/use-multistep-form";
import type { UserRole } from "@/types/auth";
import { STEPS_BY_ROLE } from "./steps";

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
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

// ─── Provider ────────────────────────────────────────────────────────────────

interface OnboardingProviderProps {
  children: ReactNode;
  role: UserRole;
}

export function OnboardingProvider({ children, role }: OnboardingProviderProps) {
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
    }),
    [multistep, role]
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
