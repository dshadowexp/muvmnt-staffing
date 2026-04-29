"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { getOnboardingCompletionStatus } from "@/features/onboarding/dal/queries";
import {
  authorizationSchema,
  canEditSocialNumber,
  normalizeSocialNumber,
  requiresSinExpiry,
} from "@/features/profile/schemas/authorization";
import { tryPromoteWorkerAfterComplianceChecks } from "@/features/workers/server/stage-promotion";

type UpsertWorkAuthorizationInput = {
  type: string;
  fileUrl?: string | null;
  socialNumber: string;
  socialNumberExpiry?: string | null;
};

export async function upsertWorkAuthorizationAction(
  input: UpsertWorkAuthorizationInput,
) {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };
  const { userId } = session;

  const parsed = authorizationSchema.safeParse({
    workAuthorization: input.type,
    socialNumber: input.socialNumber,
    socialNumberExpiry: input.socialNumberExpiry ?? "",
  });
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Invalid authorization details";
    return { error: true, message };
  }

  // undefined → no change; null → clear; string → set to new key.
  const fileUrl =
    input.fileUrl === undefined
      ? undefined
      : input.fileUrl === null || input.fileUrl.trim() === ""
        ? null
        : input.fileUrl.trim();

  const incomingSin = parsed.data.socialNumber;
  const incomingExpiry = requiresSinExpiry(parsed.data.workAuthorization)
    ? (parsed.data.socialNumberExpiry ?? null)
    : null;

  const supabase = await createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("work_authorizations")
    .select("id, social_number, social_number_expiry")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { error: true, message: existingError.message };
  }

  if (existing) {
    const { is_completed: onboardingCompleted } =
      await getOnboardingCompletionStatus(userId);
    const editable =
      !onboardingCompleted ||
      canEditSocialNumber({
        socialNumber: existing.social_number,
        socialNumberExpiry: existing.social_number_expiry,
      });

    const sinChanged =
      normalizeSocialNumber(existing.social_number) !== incomingSin;

    if (!editable && sinChanged) {
      return {
        error: true,
        message:
          "Your SIN is locked until its current expiry date has passed.",
      };
    }

    const finalSin = editable ? incomingSin : (existing.social_number ?? incomingSin);
    const finalExpiry = editable
      ? incomingExpiry
      : (existing.social_number_expiry ?? incomingExpiry);

    const { error } = await supabase
      .from("work_authorizations")
      .update({
        type: parsed.data.workAuthorization,
        ...(fileUrl !== undefined && { file_url: fileUrl }),
        social_number: finalSin,
        social_number_expiry: finalExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return { error: true, message: error.message };
    }
  } else {
    const { error } = await supabase.from("work_authorizations").insert({
      user_id: userId,
      type: parsed.data.workAuthorization,
      ...(fileUrl !== undefined && { file_url: fileUrl }),
      social_number: incomingSin,
      social_number_expiry: incomingExpiry,
      is_verified: false,
    });

    if (error) {
      return { error: true, message: error.message };
    }
  }

  await tryPromoteWorkerAfterComplianceChecks(userId);

  return { error: false, message: "Authorization saved successfully" };
}

export async function deleteWorkAuthorizationAction() {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("work_authorizations")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Work authorization removed" };
}
