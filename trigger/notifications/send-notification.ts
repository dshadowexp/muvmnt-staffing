import { logger, task } from "@trigger.dev/sdk/v3";

import {
    sendNotificationJobSchema,
    type SendNotificationJobPayload,
} from "@/features/notifications/service/schemas";
import { deliverNotification } from "@/features/notifications/service/dispatcher";

/**
 * Trigger.dev task: send a notification across 1..N channels for one user.
 *
 * Scalability notes:
 *  - Idempotency is enforced at the call site via `tasks.trigger({ idempotencyKey })`
 *    so Stripe-style duplicate deliveries or user double-clicks collapse
 *    to a single run.
 *  - `deliverNotification()` uses `Promise.allSettled`, so one flaky
 *    channel (e.g. SMS provider outage) won't block email/push. It only
 *    throws when *every* channel failed, which lets Trigger.dev's retry
 *    policy kick in without re-sending channels that already succeeded on
 *    a previous attempt.
 *  - Retries use exponential backoff + jitter (same profile as the Stripe
 *    tasks) so downstream providers aren't hammered after a blip.
 */
export const sendNotificationTask = task({
    id: "notifications.send",
    maxDuration: 120,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 2_000,
        maxTimeoutInMs: 60_000,
        factor: 2,
        randomize: true,
    },
    run: async (rawPayload: SendNotificationJobPayload) => {
        const payload = sendNotificationJobSchema.parse(rawPayload);

        logger.log("Dispatching notification", {
            userId: payload.userId,
            template: payload.template,
            channels: payload.channels,
            idempotencyKey: payload.idempotencyKey,
        });

        const results = await deliverNotification(payload);

        for (const r of results) {
            if (r.status === "fulfilled") {
                logger.log(`channel delivered: ${r.channel}`, {
                    template: payload.template,
                });
            } else {
                logger.warn(`channel failed: ${r.channel}`, {
                    template: payload.template,
                    error: r.error,
                });
            }
        }

        return {
            idempotencyKey: payload.idempotencyKey,
            results,
        };
    },
});
