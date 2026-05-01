import "server-only";

import { createAdminClient } from "@/supabase/server";

export type AcceptFacilityInviteResult =
  | { ok: true; facilityId: string | null }
  | { ok: false; code: "already_other_facility"; message: string };

/**
 * Links a verified user to a pending `facility_invites` row: inserts `operators`
 * and sets `accepted_at`. Idempotent if already a member of the same facility.
 *
 * If `inviteToken` is set, only that invite row is considered; otherwise, when
 * exactly one pending invite exists for the email, it is accepted (email-only path).
 */
export async function acceptFacilityInviteForUser(params: {
  userId: string;
  email: string;
  inviteToken?: string | null;
}): Promise<AcceptFacilityInviteResult> {
  const email = params.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const supabase = await createAdminClient();

  let query = supabase
    .from("facility_invites")
    .select("id, facility_id, permission, invited_by, token, expires_at")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", now);

  if (params.inviteToken?.trim()) {
    query = query.eq("token", params.inviteToken.trim());
  }

  const { data: invites, error: inviteErr } = await query;
  if (inviteErr) throw new Error(inviteErr.message);

  const list = invites ?? [];
  if (list.length === 0) {
    const { data: op } = await supabase
      .from("operators")
      .select("facility_id")
      .eq("user_id", params.userId)
      .maybeSingle();
    return { ok: true, facilityId: op?.facility_id ?? null };
  }

  // Multiple pending invites for the same email: require magic link (token) to disambiguate.
  if (list.length > 1 && !params.inviteToken?.trim()) {
    const { data: op } = await supabase
      .from("operators")
      .select("facility_id")
      .eq("user_id", params.userId)
      .maybeSingle();
    return { ok: true, facilityId: op?.facility_id ?? null };
  }

  const invite = list[0]!;

  const { data: existingOp } = await supabase
    .from("operators")
    .select("facility_id")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingOp && existingOp.facility_id !== invite.facility_id) {
    return {
      ok: false,
      code: "already_other_facility",
      message:
        "Your account is already linked to another organization. You cannot accept this invitation.",
    };
  }

  if (existingOp?.facility_id === invite.facility_id) {
    await supabase
      .from("facility_invites")
      .update({ accepted_at: now })
      .eq("id", invite.id);
    return { ok: true, facilityId: invite.facility_id };
  }

  const { error: insertErr } = await supabase.from("operators").insert({
    facility_id: invite.facility_id,
    user_id: params.userId,
    permission: invite.permission,
    invited_by: invite.invited_by,
  });

  if (insertErr) {
    throw new Error(insertErr.message);
  }

  const { error: updErr } = await supabase
    .from("facility_invites")
    .update({ accepted_at: now })
    .eq("id", invite.id);

  if (updErr) throw new Error(updErr.message);

  return { ok: true, facilityId: invite.facility_id };
}
