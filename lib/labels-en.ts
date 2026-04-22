/**
 * English labels for server/AI paths without next-intl. Kept in sync with
 * `messages/en.json` (`professions`, `compliance`, `skills`).
 */
import en from "@/messages/en.json";
import { normalizeProfessionId } from "@/lib/professions";

const professions = en.professions as Record<string, string>;
const compliance = en.compliance as Record<string, string>;
const skills = en.skills as Record<string, string>;
const complianceDesc = (en as { complianceDesc: Record<string, string> })
    .complianceDesc;
const skillsDesc = (en as { skillsDesc: Record<string, string> }).skillsDesc;

export function professionLabelEn(id: string | null | undefined): string {
    const key = normalizeProfessionId(id);
    return professions[key] ?? key;
}

export function complianceLabelEn(id: string | null | undefined): string {
    const k = (id ?? "").trim();
    return compliance[k] ?? k;
}

export function skillLabelEn(id: string | null | undefined): string {
    const k = (id ?? "").trim();
    return skills[k] ?? k;
}

export function complianceDescriptionEn(id: string | null | undefined): string {
    const k = (id ?? "").trim();
    return complianceDesc[k] ?? "";
}

export function skillDescriptionEn(id: string | null | undefined): string {
    const k = (id ?? "").trim();
    return skillsDesc[k] ?? "";
}
