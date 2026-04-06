"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";
import type { AddressLocation } from "@/features/geo/types";

export async function upsertLocationAction(location: AddressLocation) {
  const { user } = await getCurrentUser({ allData: true });
  if (user == null) {
    return { error: true, message: "User not authenticated" };
  }

  const supabase = await createAdminClient();
  const basePayload = {
    address: location.address,
    cell_id: location.cellId,
    lat: location.lat,
    lng: location.lng,
    user_id: user.id,
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
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Avoid setting `updated_at` to an ISO string: a `timetz` column rejects it
    // ("Invalid input syntax for type time with time zone"). Prefer DB defaults/triggers.
    const { error } = await supabase
      .from("locations")
      .update(basePayload)
      .eq("user_id", user.id);

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
