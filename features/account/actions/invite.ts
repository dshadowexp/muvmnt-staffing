"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { randomUUID } from "crypto";
import type { FacilityRole } from "@/features/auth/types";

type ActionResult = { error: false; message: string } | { error: true; message: string };

/** Send one or more email invitations for a facility. */
export async function sendFacilityInviteAction(
  emails: string[],
  permission: FacilityRole,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== "client") return { error: true, message: "Not authorized" };

  const { userId, facilityId } = session;
  if (!facilityId) return { error: true, message: "No facility found" };

  const supabase = await createAdminClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const rows = emails.map((email) => ({
    facility_id: facilityId,
    email: email.trim().toLowerCase(),
    permission,
    token: randomUUID(),
    invited_by: userId,
    expires_at: expiresAt,
  }));

  const { error } = await supabase.from("facility_invites").insert(rows);
  if (error) return { error: true, message: error.message };

  return {
    error: false,
    message: `Invite${emails.length > 1 ? "s" : ""} sent successfully`,
  };
}

/** Leave the current facility team. Blocks if the user is the sole owner. */
export async function leaveTeamAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== "client") return { error: true, message: "Not authorized" };

  const { userId, facilityId } = session;
  if (!facilityId) return { error: true, message: "No facility found" };

  const supabase = await createAdminClient();

  // Find current operator row
  const { data: self, error: selfErr } = await supabase
    .from("operators")
    .select("id, permission")
    .eq("facility_id", facilityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selfErr) return { error: true, message: selfErr.message };
  if (!self) return { error: true, message: "You are not a member of this facility" };

  // Block sole owners from leaving
  if (self.permission === "owner") {
    const { data: owners, error: ownerErr } = await supabase
      .from("operators")
      .select("id")
      .eq("facility_id", facilityId)
      .eq("permission", "owner");

    if (ownerErr) return { error: true, message: ownerErr.message };
    if (!owners || owners.length <= 1) {
      return { error: true, message: "You cannot leave as you are the sole owner" };
    }
  }

  const { error } = await supabase
    .from("operators")
    .delete()
    .eq("id", self.id)
    .eq("facility_id", facilityId);

  if (error) return { error: true, message: error.message };
  return { error: false, message: "You have left the team" };
}

/** Revoke a pending invite (scoped to the current user's facility). */
export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== "client") return { error: true, message: "Not authorized" };

  const { facilityId } = session;
  if (!facilityId) return { error: true, message: "No facility found" };

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("facility_invites")
    .delete()
    .eq("id", inviteId)
    .eq("facility_id", facilityId);

  if (error) return { error: true, message: error.message };
  return { error: false, message: "Invite revoked" };
}
