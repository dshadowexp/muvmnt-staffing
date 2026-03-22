import { z } from "zod";
export declare const ExchangeAuthTokenBody: z.ZodObject<{
    role: z.ZodOptional<z.ZodEnum<{
        worker: "worker";
        client: "client";
        admin: "admin";
    }>>;
}, z.core.$strip>;
export declare const ExchangeAuthTokenReply: z.ZodObject<{
    userId: z.ZodString;
    token: z.ZodString;
    role: z.ZodString;
}, z.core.$strip>;
export declare const SendSmsOtpBody: z.ZodObject<{
    phoneNumber: z.ZodString;
}, z.core.$strip>;
export declare const SendSmsOtpReply: z.ZodObject<{
    status: z.ZodString;
}, z.core.$strip>;
export declare const VerifySmsOtpBody: z.ZodObject<{
    phoneNumber: z.ZodString;
    code: z.ZodString;
}, z.core.$strip>;
export declare const VerifySmsOtpReply: z.ZodObject<{
    status: z.ZodString;
}, z.core.$strip>;
export declare const VerifyEmailReply: z.ZodObject<{
    verified: z.ZodBoolean;
}, z.core.$strip>;
export declare const VerifyEmailByTokenQuery: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export type VerifyEmailByTokenQueryType = z.infer<typeof VerifyEmailByTokenQuery>;
export declare const SendEmailVerificationReply: z.ZodObject<{
    sent: z.ZodBoolean;
}, z.core.$strip>;
export declare const IsFullyVerifiedReply: z.ZodObject<{
    verified: z.ZodBoolean;
}, z.core.$strip>;
export type ExchangeAuthTokenBodyType = z.infer<typeof ExchangeAuthTokenBody>;
export type ExchangeAuthTokenReplyType = z.infer<typeof ExchangeAuthTokenReply>;
export type SendSmsOtpBodyType = z.infer<typeof SendSmsOtpBody>;
export type SendSmsOtpReplyType = z.infer<typeof SendSmsOtpReply>;
export type VerifySmsOtpBodyType = z.infer<typeof VerifySmsOtpBody>;
export type VerifySmsOtpReplyType = z.infer<typeof VerifySmsOtpReply>;
export type VerifyEmailReplyType = z.infer<typeof VerifyEmailReply>;
export type SendEmailVerificationReplyType = z.infer<typeof SendEmailVerificationReply>;
export type IsFullyVerifiedReplyType = z.infer<typeof IsFullyVerifiedReply>;
