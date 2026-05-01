import type { AddressFields, AddressLocation, PlaceDetails } from "@/features/geo/types";
import { Json } from "@/supabase/types/database";

function nonEmpty(s: string | undefined | null): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Builds a persisted address row from Places details, with optional autocomplete fallbacks.
 */
export function buildAddressLocation(
  id: string,
  details: PlaceDetails,
  opts: { displayAddress: string; fallback?: AddressFields },
): AddressLocation {
  const c = details.components;
  const fb = opts.fallback;
  const line1FromGoogle = [c.streetNumber, c.route].filter(Boolean).join(" ").trim();

  return {
    id,
    lat: details.lat,
    lng: details.lng,
    address: opts.displayAddress,
    addressLine1: nonEmpty(line1FromGoogle) ?? nonEmpty(fb?.addressLine1),
    addressLine2: null,
    city: nonEmpty(c.city) ?? nonEmpty(fb?.city),
    adminArea: nonEmpty(c.state) ?? nonEmpty(fb?.province),
    postalCode: nonEmpty(c.postalCode) ?? nonEmpty(fb?.postalCode),
    countryCode: nonEmpty(c.countryCode),
    instructions: null,
  };
}

/** Optimistic row before `getPlaceDetails` resolves (autocomplete parsing only). */
export function addressLocationFromFields(
  id: string,
  fields: AddressFields,
  prev?: { lat?: number; lng?: number } | null,
): AddressLocation {
  return {
    id,
    lat: prev?.lat ?? 0,
    lng: prev?.lng ?? 0,
    address: fields.description,
    addressLine1: nonEmpty(fields.addressLine1),
    addressLine2: null,
    city: nonEmpty(fields.city),
    adminArea: nonEmpty(fields.province),
    postalCode: nonEmpty(fields.postalCode),
    countryCode: null,
    instructions: null,
  };
}

/** Serialises an AddressLocation to the JSONB shape stored in the database. */
export function toAddressJson(location: AddressLocation): Json {
  return {
    address:      location.address,
    lat:          location.lat,
    lng:          location.lng,
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2,
    city:         location.city,
    adminArea:    location.adminArea,
    postalCode:   location.postalCode,
    countryCode:  location.countryCode,
    instructions: location.instructions,
  } as Json;
}

