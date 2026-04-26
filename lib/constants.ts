import { PROFESSION_IDS, type ProfessionalRole } from "@/lib/professions";
import { UserRole } from "@/features/auth/types";
import { env } from "@/data/env/client";

// ── Site ─────────────────────────────────────────────────────────────────────
// Brand / contact data. Localized copy lives in messages/{locale}.json.
export const SITE_NAME  = "readykare";
export const SITE_EMAIL = "support@readykare.com";

// ── Locale labels ─────────────────────────────────────────────────────────────
export const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
};

// ─── Public (no session required) ────────────────────────────────────────────

export const PUBLIC_PATHS = new Set([
  "/",
  "/find-staff",
  "/find-work",
  "/screening",
  "/faq",
  "/privacy",
  "/terms",
]);

export const PUBLIC_PREFIXES: string[] = [
  "/refer",
  "/shifts/respond",   // ← email action outcome pages
];

// ─── Auth pages (redirect away if already signed in) ─────────────────────────

export const AUTH_PATHS = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
]);

// ─── Inactive / onboarding (confined to these when isActive = false) ─────────

export const INACTIVE_PREFIXES: string[] = [
  "/onboarding",
  "/review",
];

// ─── Role-based dashboard roots ───────────────────────────────────────────────
// Only the root prefix is needed — startsWith handles all sub-routes

export const DASHBOARD_PREFIXES: Record<UserRole, string[]> = {
  worker:    ["/dashboard", "/interviews", "/s"],
  client:    ["/dashboard"],
  admin:     ["/dashboard/admin", "/dashboard/referrals"],
  candidate: ["/s"],
};

export type RequesterType =
  | "Long-Term Care Home"
  | "Hospital"
  | "Retirement Community"
  | "Home Care Agency"
  | "Community Health Centre"
  | "Rehabilitation Centre"
  | "Dental / Medical Clinic"
  | "Individual"
  | "Other";

// ── Client (Find Talent) ──────────────────────────────────────────────────────
export const REQUESTER_TYPES: RequesterType[] = [
  "Long-Term Care Home",
  "Hospital",
  "Retirement Community",
  "Home Care Agency",
  "Community Health Centre",
  "Rehabilitation Centre",
  "Dental / Medical Clinic",
  "Individual",
  "Other",
];

/** Stored `clients.type` value for individual / private home-care accounts. */
export const INDIVIDUAL_CLIENT_TYPE =
  "Individual" as const satisfies RequesterType;

/** Facility types when the account represents an organization (excludes individual). */
export const ORGANIZATION_REQUESTER_TYPES: RequesterType[] =
  REQUESTER_TYPES.filter((t) => t !== INDIVIDUAL_CLIENT_TYPE);


// ── Professional (Find Work) ──────────────────────────────────────────────────
export const WORK_AUTHORIZATION_TYPES: string[] = [
  "Canadian Citizen",
  "Permanent Resident",
  "Open Work Permit",
  "Closed Work Permit",
  "Study Permit (with work authorization)",
];

/** Stable ids — labels in `messages` → `compliance` / `complianceDesc`. */
export {
  COMPLIANCE_IDS,
  COMPLIANCE_IDS_SET,
  OPTIONAL_COMPLIANCE_IDS,
  type ComplianceId,
} from "@/lib/compliance";

/** Stable ids — labels in `messages` → `skills` / `skillsDesc`. */
export {
  WORKER_SKILL_IDS,
  WORKER_SKILL_IDS_SET,
  STAFF_REQUEST_SKILL_IDS,
  STAFF_REQUEST_SKILL_IDS_SET,
  type WorkerSkillId,
  type StaffRequestSkillId,
} from "@/lib/skills";

/** Ordered list of profession ids (labels from `messages` → `professions`). */
export const PROFESSIONAL_ROLES: ProfessionalRole[] = [...PROFESSION_IDS];

export const PROVINCES: string[] = [
  "Ontario",
  "Alberta",
  "British Columbia",
  "Nova Scotia",
  "New Brunswick",
  "Prince Edward Island",
  "Newfoundland & Labrador",
  "Manitoba",
  "Saskatchewan",
  "Quebec",
];

// ── Landing — unlocalized structural data ────────────────────────────────────
// Brand/org names render as-is in both locales.
export const TRUST_LOGOS = [
  "Ontario LTC Association",
  "OLTCA",
  "Home Care Ontario",
  "HealthForceOntario",
  "CRNBC",
] as const;

export const H3_K = 20;
export const H3_RESOLUTION = 8;

export const INTERVIEW_DURATION_SECS = env.NEXT_PUBLIC_NODE_ENV === "development" ? 0.5 * 60 : 10 * 60;
export const MIN_DURATION_FOR_COMPLETED_AT_SECS = env.NEXT_PUBLIC_NODE_ENV === "development" ? 0.2 * 60 : 5 * 60;