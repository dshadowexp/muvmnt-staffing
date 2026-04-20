import "server-only";

import { enqueueNotification } from "@/features/notifications/service/enqueue";
import type { UserRole } from "@/types/auth";

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Queue a "next steps" email to land 10 minutes after a brand new user is
 * created. Goes through the in-process `enqueueNotification` so we get
 * Trigger.dev's `delay` + retry / idempotency for free.
 *
 * Idempotency key is bound to the user — even if {@link findOrCreateUser} is
 * somehow called twice for the same row (race / replay) only one job is
 * scheduled.
 */
export async function enqueueWelcomeFollowupNotification(input: {
    userId: string;
    role: UserRole | string | null;
}): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const role = (input.role ?? "client") as UserRole;

    await enqueueNotification({
        userId: input.userId,
        channels: ["email"],
        subject: "A few quick next steps",
        template: "welcome-followup",
        delayMs: TEN_MINUTES_MS,
        data: {
            firstName: null,
            isWorker: role === "worker",
            dashboardUrl: `${baseUrl}/dashboard`,
            previewText: "A few quick next steps",
            unsubscribeUrl: `${baseUrl}/`,
            privacyUrl: `${baseUrl}/`,
        },
        idempotencyKey: `welcome-followup-${input.userId}`,
    });
}
