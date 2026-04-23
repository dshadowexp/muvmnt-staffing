import type {
  Province, AvailabilityType,
  WorkSetting, FormStep, RequesterType, ShiftType, RequestUrgency,
  WorkAuthorization,
} from "@/types";
import { PROFESSION_IDS, type ProfessionalRole } from "@/lib/professions";
import { UserRole } from "@/types/auth";
import { env } from "@/data/env/client";

// ── Site ─────────────────────────────────────────────────────────────────────
// Brand / contact data. Localized copy lives in messages/{locale}.json.
export const SITE_NAME  = "ReadyKare";
export const SITE_PHONE = "1-437-979-7797";
export const SITE_EMAIL = "info@readykare.ca";
// ─── Public (no session required) ────────────────────────────────────────────

export const PUBLIC_PATHS = new Set([
  "/",
  "/find-staff",
  "/find-work",
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
  worker: ["/dashboard", "/interviews", ], // "/quiizes feature is implemented
  client: ["/dashboard"],
  admin:  ["/dashboard/admin", "/dashboard/referrals"],
};

// ── Professional (Find Work) ──────────────────────────────────────────────────
export const WORK_AUTHORIZATION_TYPES: WorkAuthorization[] = [
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

export const PROVINCES: Province[] = [
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

export const AVAILABILITY_OPTIONS: AvailabilityType[] = [
  "Full-Time",
  "Part-Time",
  "Casual / Relief",
  "Travel",
];

export const WORK_SETTINGS: WorkSetting[] = [
  "Long-Term Care",
  "Hospital",
  "Home Care",
  "Retirement Community",
  "Community Clinic",
  "Rehabilitation Centre",
];

export const FORM_STEPS: FormStep[] = [
  { id: 1, title: "Personal Info",       description: "Tell us about yourself" },
  { id: 2, title: "Professional Details", description: "Your credentials & availability" },
  { id: 3, title: "Resume & Message",    description: "Upload your resume" },
];

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

export const SHIFT_TYPES: ShiftType[] = [
  "Day",
  "Evening",
  "Night",
  "Rotating",
  "Flexible",
];

export const STAFF_COUNT_OPTIONS = ["1", "2–5", "6–10", "10+"] as const;

export const URGENCY_OPTIONS: RequestUrgency[] = [
  "Emergency (today)",
  "Within 48 hours",
  "This week",
  "Planning ahead",
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

export const INTERVIEW_DURATION_SECS = env.NEXT_PUBLIC_NODE_ENV === "development" ? 3 * 60 : 8 * 60;
export const MIN_DURATION_FOR_COMPLETED_AT_SECS = env.NEXT_PUBLIC_NODE_ENV === "development" ? 1.5 * 60 : 2.5 * 60;