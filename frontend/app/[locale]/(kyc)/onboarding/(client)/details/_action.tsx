"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { createClientAction } from "@/features/account/actions";
import { clientSchema, type ClientProfileValues } from "@/features/account/schemas/client";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export async function detailsAction(
  input: ClientProfileValues,
): Promise<OnboardingStepFormState> {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };
  if (user.role !== "client") return { ok: false, error: "User is not authorized" };

  const { success, data } = clientSchema.safeParse(input);
  if (!success) return { ok: false, error: "Invalid client data" };

  const { error, message } = await createClientAction(data);
  if (error) return { ok: false, error: message };

  const persist = await completeOnboardingStep("details");
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  return { ok: true, redirectTo: "/onboarding/location", steps: persist.steps };
}