import type { ComplianceId } from "@/lib/compliance";
import { COMPLIANCE_IDS_SET } from "@/lib/compliance";
import { DEFAULT_PROFESSION_ID } from "@/lib/professions";



/** Default profession id for new and restored staff request drafts. */
export const DEFAULT_STAFF_REQUEST_PROFESSION = DEFAULT_PROFESSION_ID;

/** Fallback id when a stored value is missing (same as default). */
export const STAFF_REQUEST_PROFESSION_PLACEHOLDER = DEFAULT_PROFESSION_ID;

/** Compliance ids always merged into `staff_requests.requirements` on save. */
export const STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS = [
    "covid_19_vaccination",
    "cpr",
    "vulnerable_sector_check",
] as const satisfies readonly ComplianceId[];

/** Keep only valid compliance ids, preserve order, dedupe. */
export function normalizeComplianceIds(ids: readonly string[]): ComplianceId[] {
    const out: ComplianceId[] = [];
    const seen = new Set<string>();
    for (const raw of ids) {
        const n = raw.trim();
        if (!COMPLIANCE_IDS_SET.has(n) || seen.has(n)) continue;
        seen.add(n);
        out.push(n as ComplianceId);
    }
    return out;
}

/** Locked compliance plus normalized user-provided requirement ids. */
export function mergePersistedStaffRequestRequirements(
    userProvided: readonly string[],
): string[] {
    return [
        ...new Set([
            ...STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS,
            ...normalizeComplianceIds(userProvided),
        ]),
    ];
}

const LOCKED_COMPLIANCE_SET = new Set<string>(
    STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS,
);

/** Optional compliance only (excludes baseline locked items every request has). */
export function staffRequestExtraRequirements(
    requirements: readonly string[],
): string[] {
    return requirements.filter((r) => !LOCKED_COMPLIANCE_SET.has(r));
}

/** Card / list titles for staff requests (no per-request role label). */
export const STAFF_REQUEST_DISPLAY_TITLE = "Staff request";

/** `staff_requests.status` — client home lists only rows with this status. */
export const STAFF_REQUEST_STATUS_PENDING_PRICING = "pending_pricing";
export const STAFF_REQUEST_STATUS_PENDING_COVERAGE = "pending_coverage";
export const STAFF_REQUEST_STATUS_CONFIRMED = "confirmed";

/** Dashboard path for a staff request (pricing → coverage → detail). */
export function clientStaffRequestHref(row: {
  id: string;
  status: string;
  pricing_tier: string | null;
}): string {
  if (row.status === STAFF_REQUEST_STATUS_CONFIRMED) {
    return `/app/requests/${row.id}`;
  }
  return `/app/requests/new`;
}

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
/** Legacy tier id still referenced by older rows and summary UI. */
export const PRICING_TIER_RESERVE = "reserve";

export const PRICING_TIER_IDS = [
    PRICING_TIER_PULSE,
    PRICING_TIER_VETTED,
    PRICING_TIER_VETERAN,
] as const;

export type PricingTierId = (typeof PRICING_TIER_IDS)[number];

export const LEGACY_PRICING_TIER_IDS = [
    PRICING_TIER_STANDARD,
    PRICING_TIER_SAME_PROFESSION,
    PRICING_TIER_CREDENTIALED,
] as const;
