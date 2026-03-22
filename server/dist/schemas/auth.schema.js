"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFullyVerifiedReply = exports.SendEmailVerificationReply = exports.VerifyEmailByTokenQuery = exports.VerifyEmailReply = exports.VerifySmsOtpReply = exports.VerifySmsOtpBody = exports.SendSmsOtpReply = exports.SendSmsOtpBody = exports.ExchangeAuthTokenReply = exports.ExchangeAuthTokenBody = void 0;
const zod_1 = require("zod");
// ─── Schemas ───────────────────────────────────────────────────────────────
// Request Body
exports.ExchangeAuthTokenBody = zod_1.z.object({
    role: zod_1.z.enum(["admin", "worker", "client"]).optional()
});
// Success Response
exports.ExchangeAuthTokenReply = zod_1.z.object({
    userId: zod_1.z.string(),
    token: zod_1.z.string(),
    role: zod_1.z.string()
});
// Send SMS OTP
exports.SendSmsOtpBody = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(10).max(20),
});
exports.SendSmsOtpReply = zod_1.z.object({
    status: zod_1.z.string(),
});
// Verify SMS OTP
exports.VerifySmsOtpBody = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(10).max(20),
    code: zod_1.z.string().min(4).max(10),
});
exports.VerifySmsOtpReply = zod_1.z.object({
    status: zod_1.z.string(),
});
// Verify email (no body; user id from JWT)
exports.VerifyEmailReply = zod_1.z.object({
    verified: zod_1.z.boolean(),
});
// Verify email by link token (GET /verify-email?token=...)
exports.VerifyEmailByTokenQuery = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
// Send email verification (authenticated; sends email with link)
exports.SendEmailVerificationReply = zod_1.z.object({
    sent: zod_1.z.boolean(),
});
exports.IsFullyVerifiedReply = zod_1.z.object({
    verified: zod_1.z.boolean(),
});
//# sourceMappingURL=auth.schema.js.map