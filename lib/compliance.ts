/**
 * Compliance type ids stored in `compliances.name` and `staff_requests.requirements`.
 * Labels: `messages` → `compliance`; long copy: `complianceDesc`.
 */
export const COMPLIANCE_IDS = [
    "cpr",
    "first_aid",
    "n95_mask_fit_test",
    "covid_19_vaccination",
    "vulnerable_sector_check",
    "tb_test",
    "immunization_record",
    "wes",
    "drivers_license",
    "diploma_degree",
] as const;

export type ComplianceId = (typeof COMPLIANCE_IDS)[number];

export const COMPLIANCE_IDS_SET = new Set<string>(COMPLIANCE_IDS);

/** Extra compliance selectable in job profile (not the always-on locked set). */
export const OPTIONAL_COMPLIANCE_IDS: ComplianceId[] = COMPLIANCE_IDS.filter(
    (id) =>
        id !== "covid_19_vaccination" &&
        id !== "cpr" &&
        id !== "vulnerable_sector_check",
);
