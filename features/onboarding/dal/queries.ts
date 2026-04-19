import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/services/supabase/server";
import {
  type OnboardingStepsJson,
  parseOnboardingSteps,
} from "@/features/onboarding/types";

export async function getOnboardingStepsJson(
  userId: string,
): Promise<OnboardingStepsJson> {
  noStore();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("onboarding")
    .select("steps")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || data == null) {
    return {};
  }

  return parseOnboardingSteps(data.steps);
}

export async function getOnboardingCompletionStatus(
  userId: string,
): Promise<{ is_completed: boolean }> {
  noStore();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("onboarding")
    .select("is_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || data == null) {
    return { is_completed: false };
  }

  return { is_completed: data.is_completed === true };
}
