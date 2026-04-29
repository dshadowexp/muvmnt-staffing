import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

export type ScreeningRow = Database["public"]["Tables"]["screenings"]["Row"];
export type ScreeningInviteRow = Database["public"]["Tables"]["screening_invites"]["Row"];
export type ScreeningCandidateRow = Database["public"]["Tables"]["screening_candidates"]["Row"];

export type CandidateIdentityVerification = {
  verified: boolean;
  verified_at: string | null;
  session_id: string | null;
};

export type CandidateWithResult = ScreeningCandidateRow & {
  interview: {
    id: string;
    result: string | null;
    feedback: unknown;
    completed_at: string | null;
  } | null;
};

// ─── Screenings ───────────────────────────────────────────────────────────────

export async function getScreeningsForFacility(
  facilityId: string,
): Promise<ScreeningRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screenings")
    .select("*")
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** @deprecated Use getScreeningsForFacility */
export const getScreeningsForClient = getScreeningsForFacility;

export async function getScreeningById(
  id: string,
  facilityId: string,
): Promise<ScreeningRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screenings")
    .select("*")
    .eq("id", id)
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

// ─── Token resolution ─────────────────────────────────────────────────────────
// All screening links are invite-only: /s/[token] where token is screening_invites.token.
// Soft-revoked invites (`status = revoked`) still resolve here — the link remains usable for candidates.

export async function resolveScreeningToken(token: string): Promise<{
  screening: ScreeningRow;
  invite: ScreeningInviteRow;
} | null> {
  const supabase = await createAdminClient();

  const { data: invite } = await supabase
    .from("screening_invites")
    .select("*, screenings(*)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return null;

  const screening = (invite as unknown as { screenings: ScreeningRow }).screenings;
  return { screening, invite };
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export type ScreeningInviteWithAudit = ScreeningInviteRow & {
  revoked_by_email: string | null;
};

export async function getInvitesForScreening(
  screeningId: string,
): Promise<ScreeningInviteWithAudit[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screening_invites")
    .select("*")
    .eq("screening_id", screeningId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const invites = data ?? [];
  const revokerIds = [
    ...new Set(
      invites.map((r) => r.revoked_by).filter((id): id is string => Boolean(id)),
    ),
  ];
  let emailById = new Map<string, string | null>();
  if (revokerIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in("id", revokerIds);
    emailById = new Map((users ?? []).map((u) => [u.id, u.email]));
  }

  return invites.map((inv) => ({
    ...inv,
    revoked_by_email: inv.revoked_by
      ? emailById.get(inv.revoked_by) ?? null
      : null,
  }));
}

/** Lowercase emails already invited for this screening (used for batch quota math). */
export async function getExistingScreeningInviteEmails(
  screeningId: string,
  emails: string[],
): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screening_invites")
    .select("email")
    .eq("screening_id", screeningId)
    .in("email", emails)
    .neq("status", "revoked");

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.email.trim().toLowerCase()));
}

// ─── Candidates ──────────────────────────────────────────────────────────────

export async function getCandidatesForScreening(
  screeningId: string,
): Promise<CandidateWithResult[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screening_candidates")
    .select("*")
    .eq("screening_id", screeningId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Load interviews for all candidates in one query
  const userIds = data.map((c) => c.user_id);
  const { data: interviews } = await supabase
    .from("interviews")
    .select("id, user_id, result, feedback, completed_at")
    .eq("screening_id", screeningId)
    .in("user_id", userIds);

  const interviewByUserId = new Map(
    (interviews ?? []).map((i) => [i.user_id, i]),
  );

  return data.map((c) => ({
    ...c,
    interview: interviewByUserId.get(c.user_id) ?? null,
  }));
}

export async function getScreeningCandidate(
  userId: string,
  screeningId: string,
): Promise<ScreeningCandidateRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screening_candidates")
    .select("*")
    .eq("user_id", userId)
    .eq("screening_id", screeningId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}
