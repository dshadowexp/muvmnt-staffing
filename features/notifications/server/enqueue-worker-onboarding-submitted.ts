"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { enqueueNotification } from "@/features/notifications/service/enqueue";

/**
 * After worker onboarding is marked complete in Supabase, notifies the user
 * (email) with the same summary as the /review page.
 *
 * Goes straight through the in-process `enqueueNotification()` API rather
 * than self-fetching `/api/notifications/send` — same guarantees
 * (idempotency via Trigger.dev), zero network hop. Fails soft: callers
 * should catch/log.
 */
export async function enqueueWorkerOnboardingSubmittedNotification(): Promise<void> {
    const session = await getSession();
    if (!session?.token || session.role !== "worker") {
        return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

    const supabase = await createAdminClient();
    const { data: worker } = await supabase
        .from("workers")
        .select("first_name")
        .eq("user_id", session.userId)
        .maybeSingle();

    const firstName = worker?.first_name?.trim() || "there";

    await enqueueNotification({
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
    });
}
