import type { Database } from "@/services/supabase/types/database";

export type ShiftLocation = {
  address: string;
  lat: number;
  lng: number;
};

/** Parse `shifts.location` from DB (jsonb). */
export function parseShiftLocation(
  raw: Database["public"]["Tables"]["shifts"]["Row"]["location"],
): ShiftLocation | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const address = typeof o.address === "string" ? o.address : "";
  const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
  const lng = typeof o.lng === "number" ? o.lng : Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { address, lat, lng };
}

/** Single-line label for lists (address, or coordinates, or em dash). */
export function formatShiftLocationLine(
  raw: Database["public"]["Tables"]["shifts"]["Row"]["location"],
): string {
  const loc = parseShiftLocation(raw);
  if (loc == null) return "—";
  const trimmed = loc.address.trim();
  if (trimmed.length > 0) return trimmed;
  return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
}
