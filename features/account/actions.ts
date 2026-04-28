"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { type ClientProfileValues } from "@/features/account/schemas/client";
import { toAddressJson } from "@/features/geo/lib/build-address-location";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult = { error: false; message: string } | { error: true; message: string };

async function upsertFacility(data: ClientProfileValues): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== "client") return { error: true, message: "Not authorized" };

  const { userId, facilityId } = session;
  const supabase = await createAdminClient();

  const addressJson = data.address ? toAddressJson(data.address) : null;
  const base = { name: data.name, type: data.type, address: addressJson };

  // If user already has a facility, update it
  if (facilityId) {
    const { error } = await supabase
      .from("facilities")
      .update({ ...base, updated_at: new Date().toISOString() })
      .eq("id", facilityId);

    if (error) return { error: true, message: error.message };
    return { error: false, message: "Profile updated successfully" };
  }

  // Otherwise create facility + operator row
  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .insert(base)
    .select("id")
    .single();

  if (facilityError || !facility) {
    return { error: true, message: facilityError?.message ?? "Failed to create facility" };
  }

  const { error: operatorError } = await supabase
    .from("operators")
    .insert({ facility_id: facility.id, user_id: userId, permission: "owner" });

  if (operatorError) {
    await supabase.from("facilities").delete().eq("id", facility.id);
    return { error: true, message: operatorError.message };
  }

  return { error: false, message: "Profile saved successfully" };
}

// ─── Exported actions ─────────────────────────────────────────────────────────

export async function createFacilityAction(data: ClientProfileValues): Promise<ActionResult> {
  return upsertFacility(data);
}

/** Same as createFacilityAction — use on account settings pages. */
export const updateFacilityProfileAction = createFacilityAction;

/** @deprecated Use createFacilityAction */
export const createClientAction = createFacilityAction;
/** @deprecated Use updateFacilityProfileAction */
export const updateClientProfileAction = updateFacilityProfileAction;
