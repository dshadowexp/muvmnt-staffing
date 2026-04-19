"use server";

import { getSession } from "@/lib/session";
import { AddressLocation, PlaceDetails } from "@/features/geo/types";
import { createAdminClient } from "@/services/supabase/server";
import { getGoogleMapsClient } from "@/services/google-maps/client";

export async function searchAddresses(
  input: string,
  sessionToken?: string,
): Promise<{ placeId: string; description: string; mainText: string; secondaryText: string }[]> {
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

export async function getAddressLocation(): Promise<AddressLocation | undefined> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const { userId } = session;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error("Failed to get location");
  if (data == null) return undefined;

  return {
    id: data.id,
    lat: data.lat,
    lng: data.lng,
    address: data.address,
    addressLine1: data.address_line_1,
    addressLine2: data.address_line_2,
    city: data.city,
    adminArea: data.admin_area,
    postalCode: data.postal_code,
    countryCode: data.country_code,
  };
}