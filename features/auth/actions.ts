"use server";

import { getAdminAuth } from "@/services/firebase/admin";
import { findOrCreateUser } from "@/features/users/dal/mutations";
import { createAdminClient } from "@/services/supabase/server";
import type { UserAuth, UserRole } from "@/features/auth/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Discriminated union returned by exchangeFirebaseUser — never throws.
 *
 * - "ok"              → user exists and session is ready, `user` is populated
 * - "not_found"       → no Supabase row and no role supplied — route to sign-up
 * - "email_taken"     → email already registered under a different account
 * - "personal_email"  → client tried to sign up with a personal email domain
 * - "invite_not_found"→ candidate email not found in any screening_invite
 * - "error"           → unexpected server/db failure, `message` describes it
 */
export type ExchangeResult =
  | { status: "ok"; user: UserAuth }
  | { status: "not_found" }
  | { status: "email_taken" }
  | { status: "personal_email" }
  | { status: "invite_not_found" }
  | { status: "error"; message: string };

// ─── Personal-domain blocklist ────────────────────────────────────────────────

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.ca", "yahoo.co.in",
  "hotmail.com", "hotmail.ca", "hotmail.co.uk",
  "outlook.com", "outlook.ca", "outlook.co.uk",
  "live.com", "live.ca", "live.co.uk",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "proton.me", "pm.me",
  "tutanota.com", "tutanota.de",
  "zoho.com", "yandex.com", "yandex.ru",
  "mail.com", "fastmail.com", "fastmail.fm",
  "hey.com", "msn.com",
]);

export async function isPersonalEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return PERSONAL_DOMAINS.has(domain);
}

// ─── Candidate invite check ───────────────────────────────────────────────────

/**
 * Checks whether the given email has a pending screening invite.
 * Safe to call from client components (server action).
 */
export async function checkCandidateInviteAction(
  email: string,
): Promise<{ valid: boolean }> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("screening_invites")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return { valid: !!data };
}

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
    // Role-specific pre-checks — only run when creating a new account (role supplied)
    if (role === "client" && !(await isPersonalEmail(email))) {
      return { status: "personal_email" };
    }

    if (role === "candidate") {
      const { valid } = await checkCandidateInviteAction(email);
      if (!valid) return { status: "invite_not_found" };
    }

    const result = await findOrCreateUser({ authId, email, emailVerified, role });

    if (result === "NOT_FOUND") return { status: "not_found" };
    if (result === "EMAIL_TAKEN") return { status: "email_taken" };

    const userRole = (result.role ?? "client") as UserRole;

    // For client users, resolve their facility + permission from the operators table
    let facilityId: string | null = null;
    let facilityRole: import("@/features/auth/types").FacilityRole | null = null;

    if (userRole === "client") {
      const supabase = await createAdminClient();
      const { data: op } = await supabase
        .from("operators")
        .select("facility_id, permission")
        .eq("user_id", result.id)
        .maybeSingle();

      if (op) {
        facilityId = op.facility_id;
        facilityRole = op.permission as import("@/features/auth/types").FacilityRole;
      }
    }

    return {
      status: "ok",
      user: {
        token: "",
        userId: result.id,
        role: userRole,
        isActive: result.is_active,
        facilityId,
        facilityRole,
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