"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import type { Json } from "@/services/supabase/types/database";
import type {
  CompleteOnboardingStepResult,
  OnboardingStepsJson,
  OnboardingStepState,
} from "@/features/onboarding/types";
import { parseOnboardingSteps } from "@/features/onboarding/types";

/**
 * Marks a step complete (idempotent). Merges into existing `onboarding.steps` JSON.
 * Returns the merged map so the client can update onboarding UI without a refetch.
 * @param markOnboardingCompleted When true, sets `onboarding.is_completed` (worker payroll finish).
 */
export async function completeOnboardingStep(
  stepId: string,
  options?: { markOnboardingCompleted?: boolean },
): Promise<CompleteOnboardingStepResult> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const userId = session.userId;
  const supabase = await createAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("onboarding")
    .select("id, steps")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { error: true, message: fetchError.message };
  }

  const prev = parseOnboardingSteps(existing?.steps);
  const existingEntry = prev[stepId];
  const next: OnboardingStepsJson = {
    ...prev,
    [stepId]:
      existingEntry?.completed === true
        ? existingEntry
        : ({ completed: true, completed_at: now } satisfies OnboardingStepState),
  };

  const markDone = options?.markOnboardingCompleted === true;

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("onboarding")
      .update({
        steps: next as unknown as Json,
        updated_at: now,
        ...(markDone ? { is_completed: true } : {}),
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: true, message: updateError.message };
    }
  } else {
    const { error: insertError } = await supabase.from("onboarding").insert({
      user_id: userId,
      steps: next as unknown as Json,
      is_completed: markDone,
    });

    if (insertError) {
      return { error: true, message: insertError.message };
    }
  }

  return { error: false, steps: next };
}
