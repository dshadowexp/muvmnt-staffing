"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const auth_repository_1 = require("./auth.repository");
const jwt_1 = require("../../utils/jwt");
const decode_1 = require("./decode");
const twilio_1 = require("../../config/twilio");
const env_1 = require("../../config/env");
const permissions_1 = require("./permissions");
const notifications_queue_1 = require("../../background/notifications.queue");
const crypt_1 = require("../../utils/crypt");
class AuthService {
    repo;
    constructor() {
        this.repo = new auth_repository_1.AuthRepository();
    }
    async exchangeToken(externalToken, role) {
        const decoded = await (0, decode_1.verifyFirebaseIdToken)(externalToken);
        const user = await this.repo.findOrCreateUser({ authId: decoded.uid, email: decoded.email ?? "", emailVerified: decoded.email_verified ?? false, role });
        const permissions = permissions_1.permissionsMap[user.role] ?? [];
        const internalToken = (0, jwt_1.signAccessToken)({
            sub: user.id,
            role: user.role,
            permissions,
        });
        return { token: internalToken, role: user.role, userId: user.id };
    }
    async smsOTP(phoneNumber) {
        const verification = await twilio_1.twilioClient.verify.v2
            .services(env_1.config.twilio.messagingId)
            .verifications.create({
            channel: "sms",
            to: phoneNumber,
        });
        return { status: verification.status };
    }
    async smsOTPCheck(userId, phoneNumber, code) {
        const verificationCheck = await twilio_1.twilioClient.verify.v2
            .services(env_1.config.twilio.messagingId)
            .verificationChecks.create({
            code: code,
            to: phoneNumber,
        });
        if (verificationCheck.status === 'approved') {
            await this.repo.updatePhoneVerified(userId, phoneNumber);
            const user = await this.repo.findById(userId);
            await (0, decode_1.updateFirebaseUser)(user.auth_id, phoneNumber);
        }
        return { status: verificationCheck.status };
    }
    /**
     * Sends an email verification link to the user's email.
     * Generates a 128-character random token, stores it with the user id, and emails a link to the server verify-email route.
     */
    async sendEmailVerification(userId) {
        const user = await this.repo.findById(userId);
        if (!user?.email) {
            throw new Error('User not found or has no email address');
        }
        const token = (0, crypt_1.encrypt)(`${user.id}:${user.email}`);
        const verifyUrl = `${env_1.config.appUrl}/v1/auth/verify-email?token=${token}`;
        await (0, notifications_queue_1.getNotificationsQueue)().enqueue({
            userId,
            channels: ['email'],
            subject: 'Verify your email',
            template: 'verify-email',
            data: { verifyUrl }
        });
        return { sent: true };
    }
    /**
     * Verifies email using the token from the verification link. Looks up user by token, marks email verified, and deletes the token.
     */
    async verifyEmailByToken(token) {
        const data = (0, crypt_1.decrypt)(token);
        const [userId, email] = data.split(":");
        await this.repo.updateEmailVerified(userId, email);
        return { verified: true };
    }
    /**
     *
     * @param userId
     * @returns
     */
    async isFullyVerified(userId) {
        const user = await this.repo.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const verified = user.is_email_verified && user.is_phone_verified;
        return { verified };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map