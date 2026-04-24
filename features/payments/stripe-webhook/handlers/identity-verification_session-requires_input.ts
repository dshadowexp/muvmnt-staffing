"use server";

import type Stripe from "stripe";
import { createAdminClient } from "@/services/supabase/server";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";

// ---------------------------------------------------------------------------
// Error code → human-readable reason
// ---------------------------------------------------------------------------

const ERROR_REASONS: Record<string, string> = {
  // Consent
  consent_declined:
    "You declined to provide consent for identity verification. Please try again and accept the required permissions.",

  // Age / country
  under_supported_age:
    "Identity verification is not available for your age group.",
  country_not_supported:
    "Your country is not currently supported for identity verification. Please contact support for assistance.",

  // Document issues
  document_unverified_other:
    "We were unable to verify your document. Please ensure the document is clearly visible and try again, or use a different document.",
  document_expired:
    "The document you provided has expired. Please use a valid, non-expired government-issued document.",
  document_type_not_supported:
    "The document type you used is not supported. Please use a passport, driver's license, or national identity card.",

  // Selfie issues
  selfie_document_missing_photo:
    "The photo on your document was missing or unclear. Please use a document with a clear photo.",
  selfie_face_mismatch:
    "Your selfie does not match the photo on your document. Please retake your selfie in good lighting.",
  selfie_manipulated:
    "Your selfie appears to have been digitally altered and could not be accepted. Please retake a genuine selfie.",
  selfie_unverified_other:
    "We were unable to verify your selfie. Please retake it in a well-lit environment and try again.",

  // ID number issues
  id_number_insufficient_document_data:
    "We could not extract enough information from your document. Please try with a clearer image or a different document.",
  id_number_mismatch:
    "The ID number on your document does not match our records. Please use the correct document.",
  id_number_unverified_other:
    "Your ID number could not be verified. Please try again or contact support.",
};

function resolveReason(code: string | null | undefined): string {
  if (!code) return "An unknown error occurred during verification. Please try again.";
  return (
    ERROR_REASONS[code] ??
    "An unexpected issue occurred during verification. Please try again or contact support."
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleIdentityVerificationSessionRequiresInput(
  session: Stripe.Identity.VerificationSession,
): Promise<void> {
  const userId = session.metadata?.user_id ?? session.client_reference_id;

  if (!userId) {
    console.error(
      "[identity-requires-input] No user_id in session metadata or client_reference_id",
      { sessionId: session.id },
    );
    return;
  }

  const errorCode = session.last_error?.code ?? null;
  const reason = resolveReason(errorCode);

  console.log("[identity-requires-input] Verification requires input", {
    sessionId: session.id,
    userId,
    errorCode,
    reason,
  });

  // We do NOT mark the row as verified — the worker needs to retry.
  // Update the session_id on the row to the latest session so the status
  // card correctly reflects the most recent attempt.
  const supabase = await createAdminClient();

  const { error: updateError } = await supabase
    .from("identity_verification")
    .update({ session_id: session.id })
    .eq("user_id", userId);

  if (updateError) {
    // Non-fatal — the notification is still worth sending even if the update fails
    console.error(
      "[identity-requires-input] Failed to update session_id on identity_verification",
      { userId, updateError },
    );
  }

  // Fetch worker first name for personalised notification copy
  const { data: worker } = await supabase
    .from("workers")
    .select("first_name")
    .eq("user_id", userId)
    .maybeSingle();

  const firstName = worker?.first_name ?? "there";
  const complianceUrl = `${env.APP_URL}/dashboard/compliance`;

  await enqueueNotification({
    userId,
    channels: [
      {
        channel: "email",
        subject: "Action needed — your identity verification requires attention",
        template: "identity-verification-failed",
        data: { firstName, reason, complianceUrl },
      },
      {
        channel: "push",
        template: "identity-verification-failed",
        data: { firstName, complianceUrl },
      },
    ],
  });

  console.log("[identity-requires-input] Notification enqueued", { userId });
}
