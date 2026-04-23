"use server";

import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { upsertWorkAuthorizationAction } from "@/features/profile/actions/authorization-actions";
import {
  buildAuthorizationSchema,
  normalizeSocialNumber,
} from "@/features/profile/schemas/authorization";
import { getSession } from "@/lib/session";

export type AuthorizationActionInput = {
  type: string;
  socialNumber: string;
  socialNumberExpiry?: string | null;
};

const authorizationInputSchema = buildAuthorizationSchema();

export const authorizationAction = async (
  input: AuthorizationActionInput,
): Promise<OnboardingStepFormState> => {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");
  if (session.role !== "worker") return onboardingStepError("userNotAuthorized");

  const parsed = authorizationInputSchema.safeParse({
    workAuthorization: input.type,
    socialNumber: input.socialNumber,
    socialNumberExpiry: input.socialNumberExpiry ?? "",
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid authorization details";
    return onboardingStepRawError(message);
  }

  const profile = await getWorkerProfile();
  if (!profile) return onboardingStepError("profileMissing");
  if (profile.photo_url === null) return onboardingStepError("photoMissing");

  const upsert = await upsertWorkAuthorizationAction({
    type: parsed.data.workAuthorization,
    socialNumber: normalizeSocialNumber(parsed.data.socialNumber),
    socialNumberExpiry: parsed.data.socialNumberExpiry ?? null,
  });
  if (upsert.error) return onboardingStepRawError(upsert.message);

  const persist = await completeOnboardingStep("authorization");
  if (persist.error) {
    return persist.message
      ? onboardingStepRawError(persist.message)
      : onboardingStepError("persistFailed");
  }

  return {
    ok: true,
    redirectTo: "/onboarding/availability",
    steps: persist.steps,
  };
};
