/**
 * Canonical profession ids (DB, APIs, logic). Labels: `messages` → `professions`.
 */
export const PROFESSION_IDS = [
    "rn",
    "rpn",
    "ien",
    "psw",
    "healthcare_support_worker",
    "allied_health_practitioner",
    "dsw",
    "cook",
] as const;

export type ProfessionalRole = (typeof PROFESSION_IDS)[number];

export const PROFESSION_IDS_SET = new Set<string>(PROFESSION_IDS);

export const DEFAULT_PROFESSION_ID: ProfessionalRole = "psw";

export function tryNormalizeProfessionId(
    raw: string | null | undefined,
): ProfessionalRole | null {
    const t = (raw ?? "").trim();
    if (!t || !PROFESSION_IDS_SET.has(t)) return null;
    return t as ProfessionalRole;
}

export function normalizeProfessionId(raw: string | null | undefined): ProfessionalRole {
    return tryNormalizeProfessionId(raw) ?? DEFAULT_PROFESSION_ID;
}
