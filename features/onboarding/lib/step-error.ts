import type { OnboardingStepFormState } from "@/features/onboarding/types";

/** English fallbacks for every `kyc.onboarding.errors` key used by server actions. */
export const ONBOARDING_ERROR_FALLBACKS = {
  userNotFound: "We couldn't find your account. Please sign in and try again.",
  userNotAuthenticated: "Please sign in to continue.",
  userNotAuthorized: "Your account isn't authorized for this action.",
  emailNotVerified: "Please verify your email address.",
  phoneNotVerified: "Please verify your phone number.",
  persistFailed: "Could not save onboarding progress.",
  invalidWorkerData: "Please check your profile details and try again.",
  invalidClientData: "Please check your organization details and try again.",
  locationMissing: "Please set your location information.",
  profileMissing: "Please complete your profile.",
  photoMissing: "Please upload a profile photo.",
  workAuthorizationMissing: "Please upload your work authorization.",
  socialNumberMissing: "Please enter your Social Insurance Number.",
  socialNumberExpiryMissing: "Please enter the expiry date for your Social Insurance Number.",
  invalidSubmission: "Invalid submission.",
  availabilityCheck: "Check your availability.",
  billingSetupIncomplete: "Please complete billing setup.",
  skipNotAllowed: "This step cannot be skipped.",
  somethingWentWrong: "Something went wrong.",
} as const;

export type OnboardingErrorKey = keyof typeof ONBOARDING_ERROR_FALLBACKS;

/**
 * Build a failure state for an onboarding server action that the client can
 * translate via `kyc.onboarding.errors.<key>`.
 *
 * Pass an `errorKey` for canonical errors (recommended). If the failure came
 * from another layer that already has an English message (e.g. a mutation),
 * forward that via `error` without providing a key.
 */
export function onboardingStepError(
  errorKey: OnboardingErrorKey,
  values?: Record<string, string | number>,
): OnboardingStepFormState {
  return {
    ok: false,
    error: ONBOARDING_ERROR_FALLBACKS[errorKey],
    errorKey,
    errorValues: values,
  };
}

/** Build a failure state from a raw (already-translated) message. */
export function onboardingStepRawError(message: string): OnboardingStepFormState {
  return { ok: false, error: message };
}
