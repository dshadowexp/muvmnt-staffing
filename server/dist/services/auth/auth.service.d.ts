import { UserRole } from "./permissions";
export declare class AuthService {
    private readonly repo;
    constructor();
    exchangeToken(externalToken: string, role?: UserRole): Promise<{
        token: string;
        role: string;
        userId: string;
    }>;
    smsOTP(phoneNumber: string): Promise<{
        status: string;
    }>;
    smsOTPCheck(userId: string, phoneNumber: string, code: string): Promise<{
        status: string;
    }>;
    /**
     * Sends an email verification link to the user's email.
     * Generates a 128-character random token, stores it with the user id, and emails a link to the server verify-email route.
     */
    sendEmailVerification(userId: string): Promise<{
        sent: boolean;
    }>;
    /**
     * Verifies email using the token from the verification link. Looks up user by token, marks email verified, and deletes the token.
     */
    verifyEmailByToken(token: string): Promise<{
        verified: boolean;
    }>;
    /**
     *
     * @param userId
     * @returns
     */
    isFullyVerified(userId: string): Promise<{
        verified: boolean;
    }>;
}
