import { z } from "zod";

/**
 * Notification delivery channel.
 *
 * Kept in sync with the channel implementations under
 * `features/notifications/channels/*`.
 */
export const notificationChannelSchema = z.enum(["email", "sms", "push"]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/**
 * Public contract for enqueueing a notification from anywhere in the app
 * (server action, API route, Trigger.dev task).
 */
export const enqueueNotificationSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    channels: z.array(notificationChannelSchema).min(1).max(3),
    subject: z.string().optional(),
    template: z.string().min(1, "Template name is required"),
    data: z.record(z.string(), z.unknown()).default({}),
    /** ms delay before the task is allowed to run. */
    delayMs: z.number().int().nonnegative().optional(),
    /** Caller-supplied dedup key. Auto-derived when omitted. */
    idempotencyKey: z.string().min(1).optional(),
});
export type EnqueueNotificationInput = z.infer<typeof enqueueNotificationSchema>;

/**
 * Wire payload the Trigger.dev task receives.
 *
 * We normalise the input at the enqueue boundary so the task can stay thin
 * and focus on delivery. `userId` is enough — the task itself looks up the
 * user's contact info at run time to avoid coupling HTTP latency to DB
 * latency.
 */
export const sendNotificationJobSchema = z.object({
    userId: z.string().uuid(),
    channels: z.array(notificationChannelSchema).min(1).max(3),
    subject: z.string().optional(),
    template: z.string().min(1),
    data: z.record(z.string(), z.unknown()),
    idempotencyKey: z.string().min(1),
});
export type SendNotificationJobPayload = z.infer<typeof sendNotificationJobSchema>;

export const upsertPushTokenSchema = z.object({
    token: z.string().min(1, "Push token is required"),
    platform: z.enum(["ios", "android", "web"]),
});
export type UpsertPushTokenInput = z.infer<typeof upsertPushTokenSchema>;
