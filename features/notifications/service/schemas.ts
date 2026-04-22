import { z } from "zod";

// ─── Channel payloads (discriminated union) ───────────────────────────────────

const emailChannelPayloadSchema = z.object({
    channel:  z.literal("email"),
    subject:  z.string().min(1),
    template: z.string().min(1),
    data:     z.record(z.string(), z.unknown()).default({}),
});

const smsChannelPayloadSchema = z.object({
    channel:  z.literal("sms"),
    template: z.string().min(1),
    data:     z.record(z.string(), z.unknown()).default({}),
});

const pushChannelPayloadSchema = z.object({
    channel:  z.literal("push"),
    template: z.string().min(1),
    data:     z.record(z.string(), z.unknown()).default({}),
});

export const channelPayloadSchema = z.discriminatedUnion("channel", [
    emailChannelPayloadSchema,
    smsChannelPayloadSchema,
    pushChannelPayloadSchema,
]);

export type ChannelPayload      = z.infer<typeof channelPayloadSchema>;
export type NotificationChannel = ChannelPayload["channel"];

// ─── Enqueue (public call-site contract) ─────────────────────────────────────

export const enqueueNotificationSchema = z.object({
    userId:         z.string().uuid("Invalid user ID"),
    channels:       z.array(channelPayloadSchema).min(1).max(3),
    delayMs:        z.number().int().nonnegative().optional(),
    idempotencyKey: z.string().min(1).optional(),
});

export type EnqueueNotificationInput = z.infer<typeof enqueueNotificationSchema>;

// ─── Job payload (enqueue → trigger.dev task) ────────────────────────────────

export const sendNotificationJobSchema = z.object({
    userId:         z.string().uuid(),
    channels:       z.array(channelPayloadSchema).min(1).max(3),
    idempotencyKey: z.string().min(1),
});

export type SendNotificationJobPayload = z.infer<typeof sendNotificationJobSchema>;