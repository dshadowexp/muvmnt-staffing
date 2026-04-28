import "server-only";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";
import type { FacilityRole } from "@/features/auth/types";

// ─── Facility ─────────────────────────────────────────────────────────────────

export async function createFacility({ name, type }: { name: string; type: string }) {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();

  // Insert facility row
  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .insert({ name, type })
    .select()
    .single();

  if (facilityError || !facility) {
    throw new Error(facilityError?.message ?? "Failed to create facility");
  }

  // Insert operator row — creator is always the owner
  const { error: operatorError } = await supabase
    .from("operators")
    .insert({ facility_id: facility.id, user_id: userId, permission: "owner" });

  if (operatorError) {
    // Roll back the facility insert to keep state consistent
    await supabase.from("facilities").delete().eq("id", facility.id);
    throw new Error(operatorError.message);
  }

  return facility;
}

export async function updateFacility(
  facilityId: string,
  { name, type }: { name: string; type: string },
) {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("facilities")
    .update({ name, type, updated_at: new Date().toISOString() })
    .eq("id", facilityId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Operators (team members) ─────────────────────────────────────────────────

export async function updateOperatorPermission(
  operatorId: string,
  facilityId: string,
  permission: FacilityRole,
) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("operators")
    .update({ permission })
    .eq("id", operatorId)
    .eq("facility_id", facilityId)
    .neq("permission", "owner"); // owners cannot be demoted via this path

  if (error) throw new Error(error.message);
}

export async function removeOperator(operatorId: string, facilityId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("operators")
    .delete()
    .eq("id", operatorId)
    .eq("facility_id", facilityId)
    .neq("permission", "owner"); // owners cannot be removed via this path

  if (error) throw new Error(error.message);
}
