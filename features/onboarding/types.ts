import type { MultistepFormStep } from "@/hooks/use-multistep-form";

/** Persisted state for a single onboarding step (stored in `onboarding.steps` JSON). */
export interface OnboardingStepState {
  completed: boolean;
  completed_at: string | null;
}

/** Full `onboarding.steps` column shape — keys match `MultistepFormStep.id`. */
export type OnboardingStepsJson = Record<string, OnboardingStepState>;

/** Returned by `completeOnboardingStep` after a successful DB write. */
export type CompleteOnboardingStepResult =
  | { error: true; message?: string }
  | { error: false; steps: OnboardingStepsJson };

/**
 * `useActionState` result for onboarding “Continue” server actions.
 *
 * `errorKey` is a stable key under `kyc.onboarding.errors` that clients translate.
 * `error` stays populated as an English fallback if translation is unavailable.
 * `errorValues` provides ICU interpolation values for the translated message.
 */
export type OnboardingStepFormState =
  | {
      ok: false;
      error: string;
      errorKey?: string;
      errorValues?: Record<string, string | number>;
    }
  | { ok: true; redirectTo: string; steps: OnboardingStepsJson };

export function parseOnboardingSteps(raw: unknown): OnboardingStepsJson {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: OnboardingStepsJson = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      value &&
      typeof value === "object" &&
      "completed" in value &&
      typeof (value as OnboardingStepState).completed === "boolean"
    ) {
      out[key] = {
        completed: (value as OnboardingStepState).completed,
        completed_at:
          typeof (value as OnboardingStepState).completed_at === "string"
            ? (value as OnboardingStepState).completed_at
            : null,
      };
    }
  }
  return out;
}

/** Shallow: every direct `dependsOn` id is marked complete (no transitive check). */
export function areDependenciesSatisfied(
  step: MultistepFormStep,
  completion: OnboardingStepsJson,
): boolean {
  return step.dependsOn.every((depId) => completion[depId]?.completed === true);
}

/**
 * First route the user should be sent to fix missing prerequisites (transitive).
 * `null` if every dependency chain is satisfied for this step.
 */
export function getOnboardingBlockerRoute(
  step: MultistepFormStep,
  completion: OnboardingStepsJson,
  allSteps: MultistepFormStep[],
): string | null {
  for (const depId of step.dependsOn) {
    const dep = allSteps.find((s) => s.id === depId);
    if (completion[depId]?.completed !== true) {
      return dep?.route ?? "/onboarding/verification";
    }
    if (dep) {
      const nested = getOnboardingBlockerRoute(dep, completion, allSteps);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/** Whether the user may open this step (all transitive dependencies completed in `completion`). */
export function canAccessStep(
  step: MultistepFormStep,
  completion: OnboardingStepsJson,
  allSteps: MultistepFormStep[],
): boolean {
  return getOnboardingBlockerRoute(step, completion, allSteps) === null;
}

/** True when any step in `freezesWhen` is complete — downstream UIs may lock this step. */
export function isStepFrozenByCompletion(
  step: MultistepFormStep,
  completion: OnboardingStepsJson,
): boolean {
  return step.freezesWhen.some((fid) => completion[fid]?.completed === true);
}

/** Route of the first incomplete prerequisite (transitive), for server redirects. */
export function getRedirectForIncompleteDependencies(
  step: MultistepFormStep,
  completion: OnboardingStepsJson,
  allSteps: MultistepFormStep[],
): string {
  return (
    getOnboardingBlockerRoute(step, completion, allSteps) ??
    "/onboarding/verification"
  );
}
