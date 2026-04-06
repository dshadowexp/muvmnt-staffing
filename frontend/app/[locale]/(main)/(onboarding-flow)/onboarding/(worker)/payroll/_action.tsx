"use server";

import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { payrollAccountMeetsOnboardingRequirements } from "@/features/billing/dal/queries";
import { enqueueWorkerOnboardingSubmittedNotification } from "@/features/notifications/server/enqueue-worker-onboarding-submitted";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export const payrollAction = async (
  _prevState: OnboardingStepFormState | undefined,
  _formData: FormData,
): Promise<OnboardingStepFormState> => {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) return { ok: false, error: "User not found" };

  const payrollOk = await payrollAccountMeetsOnboardingRequirements(user.id);
  if (!payrollOk.ok) {
    return { ok: false, error: payrollOk.message };
  }

  const persist = await completeOnboardingStep("payroll", {
    markOnboardingCompleted: true,
  });
  if (persist.error) {
    return { ok: false, error: persist.message ?? "Could not save onboarding progress" };
  }

  try {
    await enqueueWorkerOnboardingSubmittedNotification();
  } catch (err) {
    console.error("[payrollAction] onboarding submitted notification", err);
  }

  return { ok: true, redirectTo: "/review", steps: persist.steps };
  // return { ok: true, redirectTo: "/onboarding/payroll", steps: persist.steps };
};