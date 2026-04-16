"use server";

import { saveWorkerAvailabilityBundle } from "@/features/availability/dal/mutations";
import { availabilityOnboardingPayloadSchema } from "@/features/availability/schema";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";

export async function availabilityOnboardingAction(
  _prevState: OnboardingStepFormState | undefined,
  formData: FormData,
): Promise<OnboardingStepFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { ok: false, error: "Invalid submission" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "Invalid submission" };
  }

  const parsed = availabilityOnboardingPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check your availability";
    return { ok: false, error: msg };
  }

  const saved = await saveWorkerAvailabilityBundle(parsed.data);
  if (saved.error) {
    return { ok: false, error: saved.message };
  }

  const persist = await completeOnboardingStep("availability");
  if (persist.error) {
    return {
      ok: false,
      error: persist.message ?? "Could not save onboarding progress",
    };
  }

  return {
    ok: true,
    redirectTo: "/onboarding/payroll",
    steps: persist.steps,
  };
}
