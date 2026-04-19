/**
 * types/onboarding.ts
 *
 * Types for the role-based onboarding timeline.
 * Step status is derived at runtime from the user's profile completion data —
 * it is never stored directly; only the raw completion flags are persisted.
 */

export type StepStatus =
  | "complete"    // all required fields are filled
  | "in_progress" // partially filled (optional — not all steps support this)
  | "available"   // unlocked, not started
  | "locked";     // a dependency step is not yet complete

/** A single onboarding step definition (static, per role) */
export interface OnboardingStepDef {
  id:          string;
  title:       string;
  description: string;
  /** Route to navigate to when the user clicks the card */
  href:        string;
  /** Step IDs that must be "complete" before this step is unlocked */
  requires?:   string[];
  /** Icon name — maps to a Lucide icon in TimelineStep */
  icon:        OnboardingStepIcon;
  /** Estimated time shown in the tooltip / card footer */
  estimate:    string;
}

export type OnboardingStepIcon =
  | "mail-check"
  | "user"
  | "shield-check"
  | "file-text"
  | "credit-card"
  | "building-2"
  | "badge-check"
  | "lock";

/** Runtime step — step definition + resolved status */
export interface OnboardingStep extends OnboardingStepDef {
  status: StepStatus;
}

/**
 * Completion flags fetched from the backend / user profile.
 * Keys match OnboardingStepDef ids.
 */
export type CompletionMap = Record<string, boolean>;

export type Onboarding = {
  role:           string,
  steps:          OnboardingStep[],
  defs:           OnboardingStepDef[],
  totalSteps:     number,
  completedSteps: number,
  isComplete:     boolean,
}
