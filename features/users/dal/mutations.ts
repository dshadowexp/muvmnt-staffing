import { createAdminClient } from "@/services/supabase/server";
import type { UserRole } from "@/types/auth";
import type { Database } from "@/services/supabase/types/database";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function updateUserIsActive(id: string, isActive: boolean) {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from("users")
        .update({ is_active: isActive })
        .eq("id", id)
        .single();

    if (error) throw new Error(error.message);

    // Optionally revalidate user cache
    // revalidateUserCache(id);

    return data;
}

/**
 * Look up a user by their Firebase `auth_id`, falling back to inserting a new
 * row when none exists. Returns `null` when no row exists **and** no `role`
 * was supplied — mirrors the server-side {@link findOrCreateUser} contract:
 * a sign-in attempt without a known role and without a pending row is treated
 * as "user not found" so the caller can route the user to sign-up.
 */
export async function findOrCreateUser(params: {
    authId: string;
    email: string;
    emailVerified: boolean;
    role?: UserRole;
}): Promise<UserRow | null> {
    const supabase = await createAdminClient();

    const existing = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", params.authId)
        .maybeSingle();

    if (existing.error) {
        throw new Error(
            `Failed to find user by auth_id: ${existing.error.message}`,
        );
    }
    if (existing.data) return existing.data;

    if (!params.role) return null;

    const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
            auth_id: params.authId,
            email: params.email,
            role: params.role,
            is_email_verified: params.emailVerified,
        })
        .select()
        .single();

    if (insertError || !newUser) {
        throw new Error(
            `Failed to create user: ${insertError?.message ?? "unknown error"}`,
        );
    }

    return newUser;
}