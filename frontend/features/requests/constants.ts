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

/** Must match server `PRICING_TIER_*` (used when calling match). */
export const PRICING_TIER_STANDARD = "standard";
export const PRICING_TIER_SAME_PROFESSION = "same_profession";
export const PRICING_TIER_CREDENTIALED = "credentialed";
