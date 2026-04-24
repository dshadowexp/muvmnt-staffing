"use server";

import { getAdminAuth } from "@/services/firebase/admin";
import { findOrCreateUser } from "@/features/users/dal/mutations";
import type { UserAuth, UserRole } from "@/features/auth/types";

/**
 * Frontend-side equivalent of the legacy server `AuthService.exchangeToken`.
 *
 * Verifies the inbound Firebase ID token, then upserts/loads the matching
 * Supabase `users` row via {@link findOrCreateUser}. Unlike the original it
 * does **not** mint an internal JWT — sessions on the frontend are derived
 * from the Firebase token + cookie, so the returned `token` is intentionally
 * an empty string. Returning the same {@link UserAuth} shape keeps the
 * call-site contract identical to {@link exchangeToken}.
 *
 * Returns `null` when the Firebase user has no Supabase row yet **and** no
 * `role` was supplied — the caller (e.g. auth provider) treats this as
 * "needs sign-up".
 */
export async function exchangeFirebaseUser({ 
    authId, email, emailVerified, role 
}: { authId: string, email: string, emailVerified: boolean, role: UserRole | undefined }): Promise<UserAuth> {
    const user = await findOrCreateUser({
        authId,
        email,
        emailVerified,
        role,
    });

    if (!user) throw new Error("User not found");

    return {
        token: "",
        userId: user.id,
        role: (user.role ?? "client") as UserRole,
        isActive: user.is_active,
    };
}

export async function getFirebaseUser(authId: string) {
    const firebaseUser = await getAdminAuth().getUser(authId);
    return firebaseUser;
}
