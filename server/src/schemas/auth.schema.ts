import { z } from "zod";

// ─── Schemas ───────────────────────────────────────────────────────────────

// Request Body
export const ExchangeAuthTokenBody = z.object({
  role: z.enum(["admin", "worker", "client"]).optional()
});

// Success Response
export const ExchangeAuthTokenReply = z.object({
  token: z.string(),
  role: z.string()
});

// Send SMS OTP
export const SendSmsOtpBody = z.object({
  phoneNumber: z.string().min(10).max(20),
});
export const SendSmsOtpReply = z.object({
  status: z.string(),
});

// Verify SMS OTP
export const VerifySmsOtpBody = z.object({
  phoneNumber: z.string().min(10).max(20),
  code: z.string().min(4).max(10),
});
export const VerifySmsOtpReply = z.object({
  status: z.string(),
});

// Verify email (no body; user id from JWT)
export const VerifyEmailReply = z.object({
  verified: z.boolean(),
});

// Verify email by link token (GET /verify-email?token=...)
export const VerifyEmailByTokenQuery = z.object({
  token: z.string().min(1),
});
export type VerifyEmailByTokenQueryType = z.infer<typeof VerifyEmailByTokenQuery>;

// Send email verification (authenticated; sends email with link)
export const SendEmailVerificationReply = z.object({
  sent: z.boolean(),
});

export const IsFullyVerifiedReply = z.object({
  verified: z.boolean(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExchangeAuthTokenBodyType =
  z.infer<typeof ExchangeAuthTokenBody>;

export type ExchangeAuthTokenReplyType =
  z.infer<typeof ExchangeAuthTokenReply>;

export type SendSmsOtpBodyType = z.infer<typeof SendSmsOtpBody>;
export type SendSmsOtpReplyType = z.infer<typeof SendSmsOtpReply>;

export type VerifySmsOtpBodyType = z.infer<typeof VerifySmsOtpBody>;
export type VerifySmsOtpReplyType = z.infer<typeof VerifySmsOtpReply>;

export type VerifyEmailReplyType = z.infer<typeof VerifyEmailReply>;
export type SendEmailVerificationReplyType = z.infer<typeof SendEmailVerificationReply>;

export type IsFullyVerifiedReplyType =
  z.infer<typeof IsFullyVerifiedReply>;