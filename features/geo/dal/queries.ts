"use server";

import { getSession } from "@/lib/get-session";
import { AddressLocation, PlaceDetails } from "@/features/geo/types";
import { createAdminClient } from "@/supabase/server";
import { getGoogleMapsClient } from "@/services/google-maps/client";
import { OPERATOR_ROLE, STAFF_ROLE } from "@/features/auth/types";

export async function searchAddresses(
  input: string,
  sessionToken?: string,
): Promise<{ placeId: string; description: string; mainText: string; secondaryText: string }[]> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const results = await getGoogleMapsClient.autocomplete(input, sessionToken);
  return results;
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails> {
  const geocoded = await getGoogleMapsClient.getPlaceDetails(placeId, sessionToken);
  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    formattedAddress: geocoded.formattedAddress,
    placeId: geocoded.placeId,
    components: geocoded.components,
  };
}

/**
 * Reads the user's saved address from their entity table.
 * Workers → workers.address jsonb
 * Clients → facilities.address jsonb (via facilityId in session)
 */
export async function getAddressLocation(): Promise<AddressLocation | undefined> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = await createAdminClient();

  if (session.role === STAFF_ROLE) {
    const { data, error } = await supabase
      .from("workers")
      .select("address")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) throw new Error("Failed to get address");
    if (!data?.address) return undefined;

    return data.address as unknown as AddressLocation;
  }

  if (session.role === OPERATOR_ROLE) {
    const { facilityId } = session;
    if (!facilityId) return undefined;

    const { data, error } = await supabase
      .from("facilities")
      .select("address")
      .eq("id", facilityId)
      .maybeSingle();

    if (error) throw new Error("Failed to get address");
    if (!data?.address) return undefined;

    return data.address as unknown as AddressLocation;
  }

  return undefined;
}
