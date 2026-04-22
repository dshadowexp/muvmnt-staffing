import { createAdminClient } from "@/services/supabase/server";
import type { UserRole } from "@/types/auth";
import type { Database } from "@/services/supabase/types/database";
import { enqueueNotification } from "@/features/notifications/service/enqueue";


// import arcjet, { validateEmail } from "@/services/arcjet/client";

// const aj = arcjet.withRule(
//     validateEmail({
//         mode: "LIVE",
//         deny: ["INVALID", "DISPOSABLE", "NO_MX_RECORDS", "NO_GRAVATAR"],
//     })
// )

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

    // First-time sign-up — schedule a follow-up nudge 10 minutes from now.
    // Idempotent on user id, so retries / double-clicks collapse.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

    await enqueueNotification({
        userId: newUser.id,
        channels: [
            {
                channel:  "email",
                subject: "A few quick next steps",
                template: "welcome-followup",
                data: {
                    firstName: null,
                    isWorker: newUser.role === "worker",
                    dashboardUrl: `${baseUrl}/dashboard`,
                    previewText: "A few quick next steps",
                    unsubscribeUrl: `${baseUrl}/`,
                    privacyUrl: `${baseUrl}/`,
                },
            },
        ],
    });

    return newUser;
}