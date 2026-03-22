import { UserRole } from './permissions';
interface FindOrCreateUserParams {
    authId: string;
    email: string;
    emailVerified: boolean;
    role?: UserRole;
}
export interface UserRecord {
    id: string;
    auth_id: string;
    email: string;
    phone_number: string;
    role: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    is_active: boolean;
}
export declare class AuthRepository {
    constructor();
    findById(id: string): Promise<UserRecord | null>;
    findUserByAuthId(authId: string): Promise<UserRecord | null>;
    updatePhoneVerified(userId: string, phoneNumber: string): Promise<void>;
    updateEmailVerified(userId: string, email: string): Promise<void>;
    findOrCreateUser({ authId, email, role, emailVerified }: FindOrCreateUserParams): Promise<UserRecord>;
}
export {};
