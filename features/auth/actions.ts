"use server";

import { getAdminAuth } from "@/services/firebase/admin";
import { findOrCreateUser } from "@/features/users/dal/mutations";
import type { UserAuth, UserRole } from "@/features/auth/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Discriminated union returned by exchangeFirebaseUser — never throws.
 *
 * - "ok"          → user exists and session is ready, `user` is populated
 * - "not_found"   → no Supabase row and no role supplied — route to sign-up
 * - "email_taken" → email already registered under a different account —
 *                   route to sign-in
 * - "error"       → unexpected server/db failure, `message` describes it
 */
export type ExchangeResult =
  | { status: "ok"; user: UserAuth }
  | { status: "not_found" }
  | { status: "email_taken" }
  | { status: "error"; message: string };

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function exchangeFirebaseUser({
  authId,
  email,
  emailVerified,
  role,
}: {
  authId: string;
  email: string;
  emailVerified: boolean;
  role: UserRole | undefined;
}): Promise<ExchangeResult> {
  try {
    const result = await findOrCreateUser({ authId, email, emailVerified, role });

    if (result === "NOT_FOUND") return { status: "not_found" };
    if (result === "EMAIL_TAKEN") return { status: "email_taken" };

    return {
      status: "ok",
      user: {
        token: "",
        userId: result.id,
        role: (result.role ?? "client") as UserRole,
        isActive: result.is_active,
      },
    };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Unexpected error during authentication",
    };
  }
}

export async function getFirebaseUser(authId: string) {
  return getAdminAuth().getUser(authId);
}