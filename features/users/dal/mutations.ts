import "server-only";
import { createAdminClient } from "@/services/supabase/server";
import type { UserRole } from "@/features/auth/types";
import type { Database } from "@/services/supabase/types/database";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";

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
 * Sentinel values returned instead of throwing for expected failure states.
 * Real DB/network errors still throw so callers can treat throw as unrecoverable.
 */
export type FindOrCreateResult = UserRow | "NOT_FOUND" | "EMAIL_TAKEN";

/**
 * Look up a user by their Firebase `auth_id`, falling back to inserting a new
 * row when none exists.
 *
 * Returns:
 *   UserRow       → existing or newly created user
 *   "NOT_FOUND"   → no row for this auth_id and no role supplied (sign-in
 *                   attempt without an account — caller routes to sign-up)
 *   "EMAIL_TAKEN" → no row for this auth_id but the email already belongs to a
 *                   different account — caller routes to sign-in
 */
export async function findOrCreateUser(params: {
    authId: string;
    email: string;
    emailVerified: boolean;
    role?: UserRole;
  }): Promise<FindOrCreateResult> {
    const supabase = await createAdminClient();
   
    // 1. Check by auth_id first — the happy path for returning users
    const { data: existing, error: lookupError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", params.authId)
      .maybeSingle();
   
    if (lookupError) {
      throw new Error(`Failed to find user by auth_id: ${lookupError.message}`);
    }
    if (existing) return existing;

    // 2. No row for this auth_id — only relevant during sign-up
    if (!params.role) return "NOT_FOUND";

    const normalizedEmail = params.email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error(
        "No email is available for this account. Grant email access (e.g. LinkedIn) or try another sign-in method.",
      );
    }

    // 3. Before inserting, check whether this email is already registered
    //    under a different auth_id (e.g. previously signed up with Google)
    const { data: emailMatch, error: emailLookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();
   
    if (emailLookupError) {
      throw new Error(
        `Failed to check email uniqueness: ${emailLookupError.message}`,
      );
    }
    if (emailMatch) return "EMAIL_TAKEN";
   
    // 4. Email is free — create the new user row
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        auth_id: params.authId,
        email: normalizedEmail,
        role: params.role,
        is_email_verified: params.emailVerified,
        is_active: params.role === "candidate" ? true : false,
      })
      .select()
      .single();
   
    if (insertError || !newUser) {
      throw new Error(
        `Failed to create user: ${insertError?.message ?? "unknown error"}`,
      );
    }
   
    const baseUrl = env.APP_URL;
   
    await enqueueNotification({
      userId: newUser.id,
      channels: [
        {
          channel: "email",
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
   