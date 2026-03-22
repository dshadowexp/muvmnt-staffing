"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsertFcmTokenReply = exports.UpsertFcmTokenBody = exports.SendNotificationReply = exports.SendNotificationBody = void 0;
const zod_1 = require("zod");
// ─── Shared ───────────────────────────────────────────────────────────────────
const NotificationChannel = zod_1.z.enum(["email", "sms", "push"]);
// ─── Send notification ────────────────────────────────────────────────────────
exports.SendNotificationBody = zod_1.z.object({
    userId: zod_1.z.string().uuid("Invalid user ID"),
    channels: zod_1.z.union([NotificationChannel, zod_1.z.array(NotificationChannel).min(1)]),
    subject: zod_1.z.string().optional(),
    template: zod_1.z.string().min(1, "Template name is required"),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    delay: zod_1.z.number().int().nonnegative().optional().describe("Delay in ms before sending"),
    idempotencyKey: zod_1.z.string().optional().describe("Caller-supplied key; auto-derived if omitted"),
});
exports.SendNotificationReply = zod_1.z.object({
    idempotencyKey: zod_1.z.string(),
});
// ─── FCM token ────────────────────────────────────────────────────────────────
exports.UpsertFcmTokenBody = zod_1.z.object({
    token: zod_1.z.string().min(1, "FCM token is required"),
    platform: zod_1.z.enum(["ios", "android", "web"]),
});
exports.UpsertFcmTokenReply = zod_1.z.object({
    success: zod_1.z.boolean(),
});
//# sourceMappingURL=notifications.schema.js.map