import { AuthRepository } from "./auth.repository";
import { signAccessToken } from "../../utils/jwt";
import { updateFirebaseUser, verifyFirebaseIdToken } from "./decode";
import { twilioClient } from "../../config/twilio";
import { config } from "../../config/env";
import { permissionsMap, UserRole } from "./permissions";
import { getNotificationsQueue } from "../../background/notifications.queue";
import { decrypt, encrypt } from "../../utils/crypt";

export class AuthService {
    private readonly repo: AuthRepository

    constructor() {
        this.repo = new AuthRepository();
    }

    async exchangeToken(externalToken: string, role?: UserRole) {
        const decoded = await verifyFirebaseIdToken(externalToken);

        const user = await this.repo.findOrCreateUser({ authId: decoded.uid, email: decoded.email ?? "", emailVerified: decoded.email_verified ?? false, role });
        if (!user) {
            return null;
        }

        const permissions = permissionsMap[user.role as UserRole] ?? []

        const internalToken = signAccessToken({
            sub: user.id,
            role: user.role as UserRole,
            permissions,
        });

        return { token: internalToken, role: user.role, userId: user.id };
    }

    async smsOTP(phoneNumber: string) {
        const verification = await twilioClient.verify.v2
            .services(config.twilio.messagingId)
            .verifications.create({
                channel: "sms",
                to: phoneNumber,
            });

        return { status: verification.status };
    }

    async smsOTPCheck(userId: string, phoneNumber: string, code: string) {
        const verificationCheck = await twilioClient.verify.v2
            .services(config.twilio.messagingId)
            .verificationChecks.create({
                code: code,
                to: phoneNumber,
            });

        if (verificationCheck.status === 'approved') {
            await this.repo.updatePhoneVerified(userId, phoneNumber);
            const user = await this.repo.findById(userId);
            await updateFirebaseUser(user!.auth_id, phoneNumber);
        }

        return { status: verificationCheck.status };
    }

    /**
     * Sends an email verification link to the user's email.
     * Generates a 128-character random token, stores it with the user id, and emails a link to the server verify-email route.
     */
    async sendEmailVerification(userId: string): Promise<{ sent: boolean }> {
        const user = await this.repo.findById(userId);
        if (!user?.email) {
            throw new Error('User not found or has no email address');
        }

        const token = encrypt(`${user.id}:${user.email}`);

        const verifyUrl = `${config.appUrl}/v1/auth/verify-email?token=${token}`;
        await getNotificationsQueue().enqueue({
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
    async verifyEmailByToken(token: string): Promise<{ verified: boolean }> {
        const data = decrypt(token);
        const [userId, email] = data.split(":");
        await this.repo.updateEmailVerified(userId, email);
        return { verified: true };
    }

    /**
     * 
     * @param userId 
     * @returns 
     */
    async isFullyVerified(userId: string): Promise<{ verified: boolean }> {
        const user = await this.repo.findById(userId);
    
        if (!user) {
            throw new Error("User not found");
        }
    
        const verified = user.is_email_verified && user.is_phone_verified;
    
        return { verified };
    }
}