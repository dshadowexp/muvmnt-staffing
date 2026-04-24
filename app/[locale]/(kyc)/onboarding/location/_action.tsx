"use server";

import { z } from "zod";
import { completeOnboardingStep } from "@/features/onboarding/dal/mutations";
import {
  onboardingStepError,
  onboardingStepRawError,
} from "@/features/onboarding/lib/step-error";
import type { OnboardingStepFormState } from "@/features/onboarding/types";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import type { AddressLocation } from "@/features/geo/types";
import { getSession } from "@/lib/session";

const locationInputSchema = z.object({
  id: z.string().min(1),
  lat: z.number().finite(),
  lng: z.number().finite(),
  address: z.string().min(1, "Address is required"),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  adminArea: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryCode: z.string().nullable(),
  instructions: z.string().nullable(),
});

export const locationAction = async (
  input: AddressLocation,
): Promise<OnboardingStepFormState> => {
  const session = await getSession();
  if (!session) return onboardingStepError("userNotFound");

  const parsed = locationInputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid location";
    return onboardingStepRawError(message);
  }

  const upsert = await upsertLocationAction(parsed.data);
  if (upsert.error) return onboardingStepRawError(upsert.message);

  if (session.role === "worker") {
    const persist = await completeOnboardingStep("location", {
      markOnboardingCompleted: true,
    });
    if (persist.error) {
      return persist.message
        ? onboardingStepRawError(persist.message)
        : onboardingStepError("persistFailed");
    }
    return { ok: true, redirectTo: "/review", steps: persist.steps };
  } else {
    const persist = await completeOnboardingStep("location");
    if (persist.error) {
      return persist.message
        ? onboardingStepRawError(persist.message)
        : onboardingStepError("persistFailed");
    }

    return { ok: true, redirectTo: "/onboarding/billing", steps: persist.steps };
  }
};
