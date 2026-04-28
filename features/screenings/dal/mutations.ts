import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";
import { EMPTY_INTERVIEW_SUBJECT_REF } from "@/features/interviews/lib/interview-subject-ref";

export type ScreeningRow = Database["public"]["Tables"]["screenings"]["Row"];
export type ScreeningInviteRow = Database["public"]["Tables"]["screening_invites"]["Row"];
export type ScreeningCandidateRow = Database["public"]["Tables"]["screening_candidates"]["Row"];

function generateToken(): string {
  return randomBytes(20).toString("hex");
}

// ─── Screenings ───────────────────────────────────────────────────────────────

export async function insertScreening(payload: {
  facility_id: string;
  title: string;
  description: string;
  deadline_days: number;
  interview_duration: number;
  allowed_languages: string[];
  require_identity: boolean;
}): Promise<ScreeningRow> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screenings")
    .insert({ ...payload, status: "active" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateScreening(
  id: string,
  facilityId: string,
  payload: {
    title: string;
    description: string;
    deadline_days: number;
    interview_duration: number;
    allowed_languages: string[];
    require_identity: boolean;
  },
): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("screenings")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("facility_id", facilityId);
  if (error) throw new Error(error.message);
}

export async function updateScreeningStatus(
  id: string,
  facilityId: string,
  status: string,
): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("screenings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("facility_id", facilityId);
  if (error) throw new Error(error.message);
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function insertScreeningInvite(
  screeningId: string,
  email: string,
): Promise<ScreeningInviteRow> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("screening_invites")
    .insert({
      screening_id: screeningId,
      email,
      status: "pending",
      token: generateToken(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function markInviteSent(inviteId: string): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("screening_invites")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
}

// ─── Candidates ───────────────────────────────────────────────────────────────

export async function getOrCreateScreeningCandidate(
  userId: string,
  screeningId: string,
  inviteId: string | null,
  email: string,
): Promise<ScreeningCandidateRow> {
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("screening_candidates")
    .select("*")
    .eq("user_id", userId)
    .eq("screening_id", screeningId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("screening_candidates")
    .insert({
      user_id: userId,
      screening_id: screeningId,
      invite_id: inviteId,
      email,
      stage: "details",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCandidateStage(
  userId: string,
  screeningId: string,
  stage: string,
  patch?: {
    first_name?: string | null;
    last_name?: string | null;
    photo_url?: string | null;
  },
): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("screening_candidates")
    .update({ stage, updated_at: new Date().toISOString(), ...patch })
    .eq("user_id", userId)
    .eq("screening_id", screeningId);
  if (error) throw new Error(error.message);
}

export async function updateCandidateIdentityVerification(
  userId: string,
  screeningId: string,
  iv: { verified: boolean; verified_at: string | null; session_id: string | null },
): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("screening_candidates")
    .update({ identity_verification: iv, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("screening_id", screeningId);
  if (error) throw new Error(error.message);
}

/**
 * Creates a bare interview row for a screening candidate.
 * Called when the candidate advances from photo → resume stage.
 */
export async function insertScreeningInterview(
  userId: string,
  screeningId: string,
): Promise<Database["public"]["Tables"]["interviews"]["Row"]> {
  const supabase = await createAdminClient();

  // Idempotent — return existing if already created
  const { data: existing } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .eq("screening_id", screeningId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: userId,
      screening_id: screeningId,
      subject: "combined",
      subject_ref: EMPTY_INTERVIEW_SUBJECT_REF,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
