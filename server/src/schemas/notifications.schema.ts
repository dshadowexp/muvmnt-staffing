import { z } from "zod"

// ─── Shared ───────────────────────────────────────────────────────────────────

export const ErrorReply = z.object({
  statusCode: z.number(),
  error:      z.string(),
  message:    z.string(),
})

const NotificationChannel = z.enum(["email", "sms", "push"]);

// ─── Send notification ────────────────────────────────────────────────────────

export const SendNotificationBody = z.object({
    userId:          z.string().uuid("Invalid user ID"),
    channels:        z.union([NotificationChannel, z.array(NotificationChannel).min(1)]),
    subject:         z.string().optional(),
    template:        z.string().min(1, "Template name is required"),
    data:            z.record(z.string(), z.unknown()).default({}),
    delay:           z.number().int().nonnegative().optional().describe("Delay in ms before sending"),
    idempotencyKey:  z.string().optional().describe("Caller-supplied key; auto-derived if omitted"),
});

export const SendNotificationReply = z.object({
    idempotencyKey: z.string(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErrorReplyType             = z.infer<typeof ErrorReply>
export type SendNotificationBodyType   = z.infer<typeof SendNotificationBody>
export type SendNotificationReplyType  = z.infer<typeof SendNotificationReply>

// ─── FCM token ────────────────────────────────────────────────────────────────

export const UpsertFcmTokenBody = z.object({
    token:    z.string().min(1, "FCM token is required"),
    platform: z.enum(["ios", "android", "web"]),
})

export const UpsertFcmTokenReply = z.object({
    success: z.boolean(),
})

export type UpsertFcmTokenBodyType  = z.infer<typeof UpsertFcmTokenBody>
export type UpsertFcmTokenReplyType = z.infer<typeof UpsertFcmTokenReply>