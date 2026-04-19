/**
 * Used for client-side pricing simulation only (no `profession` on `staff_requests`).
 * Must match server `UNSPECIFIED_STAFF_REQUEST_PROFESSION`.
 */
export const STAFF_REQUEST_PROFESSION_PLACEHOLDER = "Unspecified";

/** Card / list titles for staff requests (no per-request role label). */
export const STAFF_REQUEST_DISPLAY_TITLE = "Staff request";

/** `staff_requests.status` — client home lists only rows with this status. */
export const STAFF_REQUEST_STATUS_PENDING_PRICING = "pending_pricing";
export const STAFF_REQUEST_STATUS_PENDING_COVERAGE = "pending_coverage";
export const STAFF_REQUEST_STATUS_CONFIRMED = "confirmed";

/** Legacy tier IDs — kept so existing rows and the matching filter don't break. */
export const PRICING_TIER_STANDARD = "standard";
export const PRICING_TIER_SAME_PROFESSION = "same_profession";
export const PRICING_TIER_CREDENTIALED = "credentialed";

/**
 * Dynamic-pricing tier IDs. Pricing is independent of the matching pool — these
 * names drive the quote and surface different add-on multipliers on top of the
 * demand-priced base. The IDs are stable and persisted on `staff_requests.pricing_tier`.
 */
export const PRICING_TIER_PULSE = "pulse";
export const PRICING_TIER_VETTED = "vetted";
export const PRICING_TIER_VETERAN = "veteran";
export const PRICING_TIER_RESERVE = "reserve";

export const PRICING_TIER_IDS = [
    PRICING_TIER_PULSE,
    PRICING_TIER_VETTED,
    PRICING_TIER_VETERAN,
    PRICING_TIER_RESERVE,
] as const;

export type PricingTierId = (typeof PRICING_TIER_IDS)[number];

export const LEGACY_PRICING_TIER_IDS = [
    PRICING_TIER_STANDARD,
    PRICING_TIER_SAME_PROFESSION,
    PRICING_TIER_CREDENTIALED,
] as const;
