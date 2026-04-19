"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import type { AddressLocation } from "@/features/geo/types";

export async function upsertLocationAction(location: AddressLocation) {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();
  const basePayload = {
    address: location.address,
    lat: location.lat,
    lng: location.lng,
    user_id: userId,
    address_line_1: location.addressLine1,
    address_line_2: location.addressLine2,
    admin_area: location.adminArea,
    city: location.city,
    country_code: location.countryCode,
    postal_code: location.postalCode,
  };

  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Avoid setting `updated_at` to an ISO string: a `timetz` column rejects it
    // ("Invalid input syntax for type time with time zone"). Prefer DB defaults/triggers.
    const { error } = await supabase
      .from("locations")
      .update(basePayload)
      .eq("user_id", userId);

    if (error) {
      return { error: true, message: error.message };
    }
    return { error: false, message: "Address updated successfully" };
  }

  const { error } = await supabase.from("locations").insert(basePayload);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Address saved successfully" };
}
