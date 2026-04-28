"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import type { AddressLocation } from "@/features/geo/types";
import { latLngToCell } from "h3-js";
import { H3_RESOLUTION } from "@/lib/constants";
import { toAddressJson } from "../lib/build-address-location";


/**
 * Saves an address for the current user directly into the entity table:
 * - Workers  → workers.address  (also syncs workers.cell_id)
 * - Clients  → facilities.address
 */
export async function upsertLocationAction(location: AddressLocation) {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };

  const supabase = await createAdminClient();
  const addressJson = toAddressJson(location);

  if (session.role === "worker") {
    const { error } = await supabase
      .from("workers")
      .update({ address: addressJson })
      .eq("user_id", session.userId);

    if (error) return { error: true, message: error.message };

    await syncWorkerCellId(session.userId, location.lat, location.lng);
    return { error: false, message: "Address updated successfully" };
  }

  if (session.role === "client") {
    const { facilityId } = session;
    if (!facilityId) return { error: true, message: "No facility found" };

    const { error } = await supabase
      .from("facilities")
      .update({ address: addressJson })
      .eq("id", facilityId);

    if (error) return { error: true, message: error.message };

    return { error: false, message: "Address updated successfully" };
  }

  return { error: true, message: "Not supported for this role" };
}

/**
 * Keeps `workers.cell_id` in sync with the worker's lat/lng so the
 * matcher (which scans workers by H3 cell) sees the new region immediately.
 */
export async function syncWorkerCellId(
  userId: string,
  lat: number,
  lng: number,
): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const supabase = await createAdminClient();
  const cellId = latLngToCell(lat, lng, H3_RESOLUTION);

  await supabase
    .from("workers")
    .update({ cell_id: cellId })
    .eq("user_id", userId);
}
