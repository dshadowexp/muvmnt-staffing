"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const auth_service_1 = require("../../services/auth/auth.service");
const auth_schema_1 = require("../../schemas/auth.schema");
const schemas_1 = require("../../schemas");
// ─── Route ────────────────────────────────────────────────────────────────────
async function authRoutes(app) {
    const authService = new auth_service_1.AuthService();
    /**
     * GET /v1/auth/verify-email?token=...
     *
     * Handles the email verification link. Validates the token, marks the user's email verified, and deletes the token.
     */
    app.get('/verify-email', {
        schema: {
            summary: 'Verify email (link)',
            description: 'Verify email using the token from the verification email link.',
            tags: ['Auth'],
            querystring: auth_schema_1.VerifyEmailByTokenQuery,
            response: {
                200: auth_schema_1.VerifyEmailReply,
                400: schemas_1.ErrorReply,
            },
        },
    }, async (request, reply) => {
        const { token } = request.query;
        const result = await authService.verifyEmailByToken(token);
        return reply.code(200).send(result);
    });
    /**
    * GET /v1/auth/is-verified
    *
    * Sends a verification email to the authenticated user with a link to verify their email.
    */
    app.get("/is-verified", {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Send email verification',
            description: 'Send an email with a verification link to the authenticated user.',
            tags: ['Auth'],
            response: {
                200: auth_schema_1.IsFullyVerifiedReply,
                401: schemas_1.ErrorReply,
            },
        },
    }, async (request, reply) => {
        const userId = request.user.sub;
        const result = authService.isFullyVerified(userId);
        return reply.code(200).send(result);
    });
    /**
     * POST /v1/auth/exchange-auth-token
     *
     * Accepts a short-lived or third-party token and returns a signed
     * JWT access token + refresh token for use across the platform.
     */
    app.post('/exchange-token', {
        schema: {
            summary: 'Exchange an auth token',
            description: 'Trade a third-party or short-lived token for a signed platform JWT.',
            tags: ['Auth'],
            body: auth_schema_1.ExchangeAuthTokenBody,
            response: {
                200: auth_schema_1.ExchangeAuthTokenReply,
                400: schemas_1.ErrorReply,
                401: schemas_1.ErrorReply,
            },
        },
    }, async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing Bearer token' });
        }
        const token = authHeader.slice(7);
        const { role } = request.body;
        const result = await authService.exchangeToken(token, role);
        return reply.code(200).send(result);
    });
    /**
     * POST /v1/auth/send-sms-otp
     *
     * Sends an SMS OTP to the given phone number.
     */
    app.post('/send-sms-otp', {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Send SMS OTP',
            description: 'Send a one-time password via SMS to the given phone number.',
            tags: ['Auth'],
            body: auth_schema_1.SendSmsOtpBody,
            response: {
                200: auth_schema_1.SendSmsOtpReply,
                400: schemas_1.ErrorReply,
            },
        },
    }, async (request, reply) => {
        const { phoneNumber } = request.body;
        const result = await authService.smsOTP(phoneNumber);
        return reply.code(200).send(result);
    });
    /**
     * POST /v1/auth/verify-sms-otp
     *
     * Verifies the SMS OTP code. Requires authentication. On success, marks the user's phone as verified.
     */
    app.post('/verify-sms-otp', {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Verify SMS OTP',
            description: 'Verify the SMS OTP code and mark phone as verified for the authenticated user.',
            tags: ['Auth'],
            body: auth_schema_1.VerifySmsOtpBody,
            response: {
                200: auth_schema_1.VerifySmsOtpReply,
                400: schemas_1.ErrorReply,
                401: schemas_1.ErrorReply,
            },
        },
    }, async (request, reply) => {
        const userId = request.user.sub;
        const body = request.body;
        const result = await authService.smsOTPCheck(userId, body.phoneNumber, body.code);
        return reply.code(200).send(result);
    });
    /**
     * POST /v1/auth/send-email-verification
     *
     * Sends a verification email to the authenticated user with a link to verify their email.
     */
    app.post('/send-email-verification', {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Send email verification',
            description: 'Send an email with a verification link to the authenticated user.',
            tags: ['Auth'],
            response: {
                200: auth_schema_1.SendEmailVerificationReply,
                401: schemas_1.ErrorReply,
            },
        },
    }, async (request, reply) => {
        const userId = request.user.sub;
        const result = await authService.sendEmailVerification(userId);
        return reply.code(200).send(result);
    });
}
//# sourceMappingURL=auth.route.js.map