"use server";

import type Stripe from "stripe";
import { createAdminClient } from "@/services/supabase/server";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";
import { tryPromoteWorkerAfterComplianceChecks } from "@/features/workers/server/stage-promotion";

export async function handleIdentityVerificationSessionVerified(
  session: Stripe.Identity.VerificationSession,
): Promise<void> {
  const supabase = await createAdminClient();

  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const type = session.metadata?.type;
  const screeningCandidateId = session.metadata?.screening_candidate_id;

  if (!userId) {
    console.error(
      "[identity-verified] No user_id in session metadata or client_reference_id",
      { sessionId: session.id },
    );
    return;
  }

  // ── Candidate path ──────────────────────────────────────────────────────────
  if (type === "candidate" && screeningCandidateId) {
    const { error } = await supabase
      .from("screening_candidates")
      .update({
        identity_verification: {
          verified: true,
          verified_at: new Date().toISOString(),
          session_id: session.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", screeningCandidateId);

    if (error) {
      throw new Error(
        `[identity-verified] Failed to update candidate identity_verification: ${error.message}`,
      );
    }

    console.log("[identity-verified] Candidate identity_verification marked verified", {
      sessionId: session.id,
      screeningCandidateId,
      userId,
    });
    return;
  }

  // ── Worker path (existing) ──────────────────────────────────────────────────
  const { error: updateError, data: updatedRows } = await supabase
    .from("identity_verification")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq("session_id", session.id)
    .select("id");

  if (updateError) {
    throw new Error(
      `[identity-verified] Failed to mark identity_verification as verified: ${updateError.message}`,
    );
  }

  // Fallback: session_id not found — upsert by user_id
  if (!updatedRows || updatedRows.length === 0) {
    console.warn(
      "[identity-verified] session_id not found in identity_verification — upserting by user_id",
      { sessionId: session.id, userId },
    );

    const { error: upsertError } = await supabase
      .from("identity_verification")
      .upsert(
        {
          user_id: userId,
          session_id: session.id,
          verified: true,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      throw new Error(
        `[identity-verified] Upsert by user_id failed: ${upsertError.message}`,
      );
    }
  }

  console.log("[identity-verified] identity_verification marked as verified", {
    sessionId: session.id,
    userId,
  });

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
        subject: "Your identity has been verified",
        template: "identity-verified",
        data: { firstName, complianceUrl },
      },
      {
        channel: "push",
        template: "identity-verified",
        data: { firstName, complianceUrl },
      },
    ],
  });

  console.log("[identity-verified] Notification enqueued", { userId });

  await tryPromoteWorkerAfterComplianceChecks(userId);
}
