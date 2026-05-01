import { z } from "zod";
import type { Json } from "@/supabase/types/database";

/** Payload for `upsertStaffRequestScheduleAction` (validated in create draft schema). */
export const createDraftLocationSchema = z.object({
    lat: z.number().finite(),
    lng: z.number().finite(),
    address: z.string().min(1),
    postal_code: z.string().nullish(),
    address_line_2: z.string().nullish(),
    address_line_1: z.string().nullish(),
    city: z.string().nullish(),
    admin_area: z.string().nullish(),
    country_code: z.string().nullish(),
    instructions: z.string().nullish(),
});

export type CreateDraftLocationPayload = z.infer<typeof createDraftLocationSchema>;

/** Display / site card shape (snake_case, aligned with `locations` and detail UIs). */
export type StaffRequestSiteAddressRow = {
    address: string;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    admin_area: string | null;
    postal_code: string | null;
    country_code: string | null;
    instructions: string | null;
};

/**
 * Convert validated draft location to a JSON object for `staff_requests.location`.
 */
export function locationPayloadToJson(
    p: CreateDraftLocationPayload,
): Record<string, unknown> {
    return { ...p };
}

/**
 * Parse `staff_requests.location` jsonb into a site row for UI. Returns null if
 * missing or not usable.
 */
export function parseSiteRowFromStaffRequestLocation(
    json: Json | null,
): StaffRequestSiteAddressRow | null {
    if (json == null || typeof json !== "object" || Array.isArray(json)) {
        return null;
    }
    const o = json as Record<string, unknown>;
    const address = typeof o.address === "string" ? o.address : "";
    if (!address.trim()) return null;
    return {
        address,
        address_line_1:
            typeof o.address_line_1 === "string" ? o.address_line_1 : null,
        address_line_2:
            typeof o.address_line_2 === "string" ? o.address_line_2 : null,
        city: typeof o.city === "string" ? o.city : null,
        admin_area: typeof o.admin_area === "string" ? o.admin_area : null,
        postal_code: typeof o.postal_code === "string" ? o.postal_code : null,
        country_code: typeof o.country_code === "string" ? o.country_code : null,
        instructions: typeof o.instructions === "string" ? o.instructions : null,
    };
}

/**
 * Parse `facilities.address` JSON (`toAddressJson` camelCase + snake_case fallbacks).
 */
export function parseSiteRowFromFacilityAddressJson(
    json: Json | null,
): StaffRequestSiteAddressRow | null {
    if (json == null || typeof json !== "object" || Array.isArray(json)) {
        return null;
    }
    const o = json as Record<string, unknown>;
    const trim = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const line1 = trim(o.addressLine1) || trim(o.address_line_1);
    const line2 = trim(o.addressLine2) || trim(o.address_line_2);
    const city = trim(o.city);
    const admin = trim(o.adminArea) || trim(o.admin_area);
    const postal = trim(o.postalCode) || trim(o.postal_code);
    const country = trim(o.countryCode) || trim(o.country_code);
    const single = trim(o.address);
    const composed = [
        line1,
        line2,
        [city, admin].filter(Boolean).join(", ") || null,
        postal,
        country,
    ]
        .filter(Boolean)
        .join(", ");
    const display = single || composed;
    if (!display) return null;
    return {
        address: single || display,
        address_line_1: line1 || null,
        address_line_2: line2 || null,
        city: city || null,
        admin_area: admin || null,
        postal_code: postal || null,
        country_code: country || null,
        instructions: trim(o.instructions) || null,
    };
}

/**
 * Lat/lng + address for shift rows and worker emails (matches `ShiftLocationPayload`).
 */
export function parseShiftLocationFromStaffRequestLocation(
    json: Json | null,
): { address: string; lat: number; lng: number } | null {
    if (json == null || typeof json !== "object" || Array.isArray(json)) {
        return null;
    }
    const o = json as Record<string, unknown>;
    const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
    const lng = typeof o.lng === "number" ? o.lng : Number(o.lng);
    const address = typeof o.address === "string" ? o.address : "";
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address.trim()) {
        return null;
    }
    return { address, lat, lng };
}

export function formatStaffRequestSiteLine(
    loc: StaffRequestSiteAddressRow,
): string {
    const single = loc.address?.trim();
    if (single) return single;
    const parts = [
        loc.address_line_1,
        loc.address_line_2,
        [loc.city, loc.admin_area].filter(Boolean).join(", ") || null,
        loc.postal_code,
        loc.country_code,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(", ") : "";
}

function trimUnknown(v: unknown): string {
    return typeof v === "string" ? v.trim() : "";
}

/**
 * Single-line address for admin / summaries. Handles stored request JSON
 * (snake_case draft), `toAddressJson`-style camelCase, and partial rows.
 */
export function formatStaffRequestLocationDisplay(json: Json | null): string {
    const row = parseSiteRowFromStaffRequestLocation(json);
    if (row) {
        const line = formatStaffRequestSiteLine(row);
        if (line.trim()) return line;
    }
    if (json != null && typeof json === "object" && !Array.isArray(json)) {
        const j = json as Record<string, unknown>;
        const parts = [
            trimUnknown(j.addressLine1) || trimUnknown(j.address_line_1),
            trimUnknown(j.addressLine2) || trimUnknown(j.address_line_2),
            trimUnknown(j.city),
            trimUnknown(j.adminArea) || trimUnknown(j.admin_area),
            trimUnknown(j.postalCode) || trimUnknown(j.postal_code),
            trimUnknown(j.countryCode) || trimUnknown(j.country_code),
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(", ");
        const a = trimUnknown(j.address);
        if (a) return a;
    }
    return "—";
}
