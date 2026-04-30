import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { FacilityPermission } from "@/features/auth/types";

export type OperatorRow = {
  id: string;
  user_id: string;
  email: string | null;
  permission: FacilityPermission;
  invited_by: string | null;
  created_at: string;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  permission: string;
  expires_at: string;
  created_at: string;
};

/** Fetch all operators for a facility, joining users for email. */
export async function getOperators(facilityId: string): Promise<OperatorRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("operators")
    .select("id, user_id, permission, invited_by, created_at, user:users!user_id(email)")
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    email: (row.user as { email: string | null } | null)?.email ?? null,
    permission: row.permission as FacilityPermission,
    invited_by: row.invited_by,
    created_at: row.created_at,
  }));
}

/** Fetch pending (unaccepted, unexpired) invites for a facility. */
export async function getPendingInvites(facilityId: string): Promise<PendingInviteRow[]> {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("facility_invites")
    .select("id, email, permission, expires_at, created_at")
    .eq("facility_id", facilityId)
    .is("accepted_at", null)
    .gte("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
