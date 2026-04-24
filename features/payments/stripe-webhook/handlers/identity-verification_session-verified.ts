"use server";

import type Stripe from "stripe";
import { createAdminClient } from "@/services/supabase/server";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";

export async function handleIdentityVerificationSessionVerified(
  session: Stripe.Identity.VerificationSession,
): Promise<void> {
  const supabase = await createAdminClient();

  // Resolve the user_id from metadata (set at session creation time)
  const userId = session.metadata?.user_id ?? session.client_reference_id;

  if (!userId) {
    console.error(
      "[identity-verified] No user_id in session metadata or client_reference_id",
      { sessionId: session.id },
    );
    return;
  }

  // Mark the identity_verification row as verified, matched by session_id
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

  // Fallback: if session_id wasn't found (edge case — race between insert and
  // webhook delivery), upsert by user_id so the record is never left stale.
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
}
