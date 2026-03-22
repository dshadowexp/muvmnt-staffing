import { z } from "zod";
export declare const SendNotificationBody: z.ZodObject<{
    userId: z.ZodString;
    channels: z.ZodUnion<readonly [z.ZodEnum<{
        push: "push";
        email: "email";
        sms: "sms";
    }>, z.ZodArray<z.ZodEnum<{
        push: "push";
        email: "email";
        sms: "sms";
    }>>]>;
    subject: z.ZodOptional<z.ZodString>;
    template: z.ZodString;
    data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    delay: z.ZodOptional<z.ZodNumber>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SendNotificationReply: z.ZodObject<{
    idempotencyKey: z.ZodString;
}, z.core.$strip>;
export type SendNotificationBodyType = z.infer<typeof SendNotificationBody>;
export type SendNotificationReplyType = z.infer<typeof SendNotificationReply>;
export declare const UpsertFcmTokenBody: z.ZodObject<{
    token: z.ZodString;
    platform: z.ZodEnum<{
        ios: "ios";
        android: "android";
        web: "web";
    }>;
}, z.core.$strip>;
export declare const UpsertFcmTokenReply: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
export type UpsertFcmTokenBodyType = z.infer<typeof UpsertFcmTokenBody>;
export type UpsertFcmTokenReplyType = z.infer<typeof UpsertFcmTokenReply>;
