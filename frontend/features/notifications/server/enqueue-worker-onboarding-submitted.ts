"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";

/**
 * After worker onboarding is marked complete in Supabase, notifies the user (email + SMS)
 * with the same summary as the /review page. Fails soft: callers should catch/log.
 */
export async function enqueueWorkerOnboardingSubmittedNotification(): Promise<void> {
  const session = await getSession();
  if (!session?.token || session.role !== "worker") {
    return;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!apiUrl) {
    console.error("NEXT_PUBLIC_API_URL is not set");
    return;
  }

  const supabase = await createAdminClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("first_name")
    .eq("user_id", session.userId)
    .maybeSingle();

  const firstName = worker?.first_name?.trim() || "there";

  const res = await fetch(`${apiUrl}/v1/notifications/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: session.userId.trim(),
      channels: ["email"],
      subject: "Your Muvmnt application is under review",
      template: "worker-onboarding-submitted",
      data: {
        firstName,
        reviewUrl: `${baseUrl}/review`,
        unsubscribeUrl: `${baseUrl}/`,
        privacyUrl: `${baseUrl}/`,
      },
      idempotencyKey: `send-onboarding-submitted-${session.userId}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Notification enqueue failed: ${res.status} ${text}`);
  }
}
