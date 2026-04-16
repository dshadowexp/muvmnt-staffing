/** Default “role” string for pricing / same-profession tier logic (no `profession` column on `staff_requests`). */
export const UNSPECIFIED_STAFF_REQUEST_PROFESSION = 'Unspecified';

/** After create, before tier + match (`staff_requests.status`). */
export const STAFF_REQUEST_STATUS_PENDING_PRICING = 'pending_pricing';

/** After match, proposed coverage stored; awaiting client confirm. */
export const STAFF_REQUEST_STATUS_PENDING_COVERAGE = 'pending_coverage';

/** After the client confirms coverage (`staff_requests.status`). */
export const STAFF_REQUEST_STATUS_CONFIRMED = 'confirmed';

/** Pricing / matching pool — stored on `staff_requests.pricing_tier`. */
export const PRICING_TIER_STANDARD = 'standard';
export const PRICING_TIER_SAME_PROFESSION = 'same_profession';
export const PRICING_TIER_CREDENTIALED = 'credentialed';
