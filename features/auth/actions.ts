"use server";

import { getAdminAuth } from "@/services/firebase/admin";
import { findOrCreateUser } from "@/features/users/dal/mutations";
import { acceptFacilityInviteForUser } from "@/features/account/server/accept-facility-invite";
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
 * - "invite_not_found"   → candidate email not found in any screening_invite
 * - "facility_invite_conflict" → user already in another org; cannot accept team invite
 * - "error"                → unexpected server/db failure, `message` describes it
 */
export type ExchangeResult =
  | { status: "ok"; user: UserAuth }
  | { status: "not_found" }
  | { status: "email_taken" }
  | { status: "personal_email" }
  | { status: "invite_not_found" }
  | { status: "facility_invite_conflict"; message: string }
  | { status: "error"; message: string };

  /**
 * Discriminated union returned by checkEmailAction.
 *
 * - "existing_client"  → email belongs to an existing client/admin user → show sign-in options
 * - "invite_pending"   → email has an unaccepted, unexpired facility invite → check email
 * - "personal_email"   → personal domain (gmail, etc.) → prompt for work email
 * - "wrong_role"       → user exists but as worker/candidate → redirect them
 * - "not_found"        → no account, no invite → suggest sign-up or contact admin
 * - "error"            → unexpected server failure
 */
export type CheckEmailOutcome =
| { status: "existing_client" }
| { status: "invite_pending" }
| { status: "personal_email" }
| { status: "wrong_role"; hint: "worker" | "candidate" }
| { status: "not_found" }
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

function isPersonalDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return PERSONAL_DOMAINS.has(domain);
}

export async function isPersonalEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return PERSONAL_DOMAINS.has(domain);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function exchangeFirebaseUser({
  authId,
  email,
  emailVerified,
  role,
  inviteToken,
}: {
  authId: string;
  email: string;
  emailVerified: boolean;
  role: UserRole | undefined;
  /** Optional facility invite token from `/join/team/...` → sign-up/sign-in query. */
  inviteToken?: string | null;
}): Promise<ExchangeResult> {
  try {
    // NOTE: Personal-email restriction temporarily disabled for testing.
    // If you re-enable, ensure the predicate matches intent (block personal domains).

    const result = await findOrCreateUser({ authId, email, emailVerified, role });

    if (result === "NOT_FOUND") return { status: "not_found" };
    if (result === "EMAIL_TAKEN") return { status: "email_taken" };

    const userRole = (result.role ?? "client") as UserRole;

    if (userRole === "client") {
      const accepted = await acceptFacilityInviteForUser({
        userId: result.id,
        email,
        inviteToken: inviteToken ?? null,
      });
      if (!accepted.ok && accepted.code === "already_other_facility") {
        return {
          status: "facility_invite_conflict",
          message: accepted.message,
        };
      }
    }

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


// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Smart email routing for the facility sign-in page.
 * Checks the email against users, facility_invites, and domain blocklist
 * to determine the correct next step without exposing account existence.
 */
export async function checkEmailAction(
  email: string,
): Promise<CheckEmailOutcome> {
  try {
    const normalised = email.trim().toLowerCase();

    // 1. Personal domain check — facilities should use work emails
    // if (isPersonalDomain(normalised)) {
    //   return { status: "personal_email" };
    // }

    const supabase = await createAdminClient();

    // 2. Check existing users table
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("email", normalised)
      .maybeSingle();

    if (user) {
      if (user.role === "client" || user.role === "admin") {
        return { status: "existing_client" };
      }
      if (user.role === "worker") {
        return { status: "wrong_role", hint: "worker" };
      }
      if (user.role === "candidate") {
        return { status: "wrong_role", hint: "candidate" };
      }
    }

    // 3. Check pending facility invite (unexpired, not yet accepted)
    const now = new Date().toISOString();
    const { data: invite } = await supabase
      .from("facility_invites")
      .select("id")
      .eq("email", normalised)
      .is("accepted_at", null)
      .gt("expires_at", now)
      .maybeSingle();

    if (invite) {
      return { status: "invite_pending" };
    }

    // 4. No match anywhere
    return { status: "not_found" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}

type FacilityDomainCheck =
  | { status: "ok" }
  | { status: "invite_pending" }
  | { status: "facility_exists"; facilityName: string | null };

/** Hard-block facility sign-up when the domain is already registered. */
export async function checkFacilityDomainAction(
  email: string,
): Promise<FacilityDomainCheck> {
  try {
    const normalised = email.trim().toLowerCase();
    const domain = normalised.split("@")[1]?.toLowerCase() ?? "";
    if (!domain) return { status: "ok" };

    const supabase = await createAdminClient();

    // 1) Pending invite for this exact email → allow (invite-first flow)
    const now = new Date().toISOString();
    const { data: invite } = await supabase
      .from("facility_invites")
      .select("id")
      .eq("email", normalised)
      .is("accepted_at", null)
      .gt("expires_at", now)
      .maybeSingle();

    if (invite) return { status: "invite_pending" };

    // 2) Facility already claimed this domain → block
    const { data: facility } = await supabase
      .from("facilities")
      .select("name")
      .contains("domains", [domain])
      .maybeSingle();

    if (facility) return { status: "facility_exists", facilityName: facility.name ?? null };

    return { status: "ok" };
  } catch {
    // Default to allowing the user to proceed if the check fails.
    return { status: "ok" };
  }
}

/**
 * Facility email/password sign-in: only allow the password step when this email
 * belongs to a user with an `operators` row (facility access).
 */
export type FacilityOperatorSignInCheck =
  | { status: "password_allowed" }
  | {
      status: "domain_registered";
      facilityName: string | null;
      domain: string;
    }
  | { status: "invite_pending" }
  | { status: "wrong_role"; hint: "worker" | "candidate" }
  | { status: "no_operator_access" }
  | { status: "not_found" };

export async function checkFacilityOperatorSignInAction(
  email: string,
): Promise<FacilityOperatorSignInCheck> {
  try {
    const normalised = email.trim().toLowerCase();
    const domain = normalised.split("@")[1]?.toLowerCase() ?? "";

    const supabase = await createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", normalised)
      .maybeSingle();

    if (user) {
      if (user.role === "worker") {
        return { status: "wrong_role", hint: "worker" };
      }
      if (user.role === "candidate") {
        return { status: "wrong_role", hint: "candidate" };
      }
      if (user.role !== "client" && user.role !== "admin") {
        return { status: "no_operator_access" };
      }

      const { data: op } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (op) return { status: "password_allowed" };

      return { status: "no_operator_access" };
    }

    const now = new Date().toISOString();
    const { data: invite } = await supabase
      .from("facility_invites")
      .select("id")
      .eq("email", normalised)
      .is("accepted_at", null)
      .gt("expires_at", now)
      .maybeSingle();

    if (invite) return { status: "invite_pending" };

    if (domain) {
      const { data: facility } = await supabase
        .from("facilities")
        .select("name")
        .contains("domains", [domain])
        .maybeSingle();

      if (facility) {
        return {
          status: "domain_registered",
          facilityName: facility.name ?? null,
          domain,
        };
      }
    }

    return { status: "not_found" };
  } catch {
    return { status: "not_found" };
  }
}
