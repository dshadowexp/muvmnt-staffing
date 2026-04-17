"use client";

import { useTranslations } from "next-intl";
import type { OnboardingStepFormState } from "@/features/onboarding/types";

/**
 * Resolve the user-facing message for an onboarding step failure.
 *
 * `state.errorKey` is a bare key under `kyc.onboarding.errors` (e.g.
 * `"userNotFound"`) or a dotted path that opts into another sibling namespace
 * (e.g. `"validation.timezoneRequired"`). Unknown keys fall back to the English
 * `error` string.
 */
export function useTranslatedStepError(): (
  state: Extract<OnboardingStepFormState, { ok: false }>,
) => string {
  const tErrors = useTranslations("kyc.onboarding.errors");
  const tValidation = useTranslations("kyc.onboarding.validation");

  return (state) => {
    const raw = state.errorKey;
    if (!raw) return state.error;

    const [head, ...rest] = raw.split(".");
    const remainder = rest.join(".");

    try {
      if (remainder && head === "validation") {
        return tValidation(remainder, state.errorValues);
      }
      return tErrors(raw, state.errorValues);
    } catch {
      return state.error;
    }
  };
}
