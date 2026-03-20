"use server";

import { getSession } from "@/lib/session";
import { AddressLocation, PlaceDetails } from "@/features/geo/types";
import { createAdminClient } from "@/services/supabase/server";
import { getGoogleMapsClient } from "@/services/google-maps/client";
import { getH3Service } from "@/services/h3/h3-client";

export async function searchAddresses(
  input: string,
  sessionToken?: string,
): Promise<{ placeId: string; description: string; mainText: string; secondaryText: string }[]> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const params = new URLSearchParams({ input });
  if (sessionToken) params.set("sessionToken", sessionToken);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/geo/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to search addresses");
  }

  return (await res.json()) as { placeId: string; description: string; mainText: string; secondaryText: string }[];
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails & { cellId: string }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const geocoded = await getGoogleMapsClient.getPlaceDetails(placeId, sessionToken);
  const cellId = getH3Service.encode(geocoded.lat, geocoded.lng);

  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    formattedAddress: geocoded.formattedAddress,
    placeId: geocoded.placeId,
    components: geocoded.components,
    cellId,
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
    cellId: data.cell_id,
  };
}