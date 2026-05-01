"use server";

import { getTranslations } from "next-intl/server";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { createFacilityAction } from "@/features/account/actions";
import {
  buildClientSchema,
  type ClientProfileValues,
} from "@/features/account/schemas/client";
import { getSession } from "@/lib/get-session";
import { isFacilityOperatorRole } from "@/features/auth/lib/facility-operator-role";
import { refreshOperatorSessionAction } from "@/features/auth/actions";

export async function detailsAction(
  input: ClientProfileValues & {
    operatorFirstName?: string | null;
    operatorLastName?: string | null;
  },
): Promise<OnboardingStepFormState> {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  if (!isFacilityOperatorRole(session.role)) return onboardingStepError("userNotAuthorized");

  // ── 1. Validate (re-parse from normalized domains — same rules as the form) ─
  const tVal = await getTranslations("kyc.onboarding.validation");
  const schema = buildClientSchema((key, values) => tVal(key, values));
  const { success, data } = schema.safeParse({
    name: input.name,
    type: input.type,
    address: input.address,
    domainsText: input.domains.join("\n"),
  });
  if (!success) return onboardingStepError("invalidClientData");

  // ── 2. Save facility + address in one call ────────────────────────────────
  const { error, message } = await createFacilityAction(data, {
    first_name: (input.operatorFirstName ?? null)?.trim() || null,
    last_name: (input.operatorLastName ?? null)?.trim() || null,
  });
  if (error) return onboardingStepRawError(message);

  await refreshOperatorSessionAction();

  // ── 3. Mark step complete ─────────────────────────────────────────────────
  const persist = await completeOnboardingStep("details");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return { ok: true, redirectTo: "/onboarding/billing", steps: persist.steps };
}
