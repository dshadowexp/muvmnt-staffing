import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import {
    sendNotificationJobSchema,
} from "@/features/notifications/service/schemas";
import { deliverNotification } from "@/features/notifications/service/dispatcher";

export const sendNotificationTask = schemaTask({
    id: "notifications.send",
    schema: sendNotificationJobSchema,
    maxDuration: 120,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 2_000,
        maxTimeoutInMs: 60_000,
        factor: 2,
        randomize: true,
    },
    run: async (payload) => {
        logger.log("Dispatching notification", {
            userId:         payload.userId,
            idempotencyKey: payload.idempotencyKey,
            channels: payload.channels.map((ch) => ({
                channel:  ch.channel,
                template: ch.template,
            })),
        });

        const results = await deliverNotification(payload);

        for (const r of results) {
            if (r.status === "fulfilled") {
                logger.log(`channel delivered: ${r.channel}`);
            } else {
                logger.warn(`channel failed: ${r.channel}`, { error: r.error });
            }
        }

        return {
            idempotencyKey: payload.idempotencyKey,
            results,
        };
    },
});