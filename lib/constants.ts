import type {
  Province, AvailabilityType,
  WorkSetting, FormStep, RequesterType, ShiftType, RequestUrgency,
  WorkAuthorization,
} from "@/types";
import { PROFESSION_IDS, type ProfessionalRole } from "@/lib/professions";

// ── Site ─────────────────────────────────────────────────────────────────────
// Brand / contact data. Localized copy lives in messages/{locale}.json.
export const SITE_NAME  = "ReadyKare";
export const SITE_PHONE = "1-437-979-7797";
export const SITE_EMAIL = "info@readykare.ca";
export const PUBLIC_PATHS: string[] = [
  "/",
  "/find-staff",
  "/find-work",
  "/faq",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/privacy",
  "/terms",
];
export const NON_ORG_PREFIXES: string[] = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/find-staff",
  "/find-work",
  "/privacy",
  "/terms",
  "/refer",
];
export const INACTIVE_PREFIXES: string[] = [
  "/onboarding",
  "/review",
];

export const WORKER_DASHBOARD_PREFIXES: string[] = [
  "/dashboard",
  "/dashboard/shifts",
  "/dashboard/requests",
  "/dashboard/availability",
  "/dashboard/profile",
  "/dashboard/assessments",
  "/dashboard/compliance",
  "/dashboard/payroll",
  "/dashboard/referrals",
  "/interviews",
  "/quizes",
];

export const CLIENT_DASHBOARD_PREFIXES: string[] = [
  "/dashboard",
  "/dashboard/requests",
  "/dashboard/account",
  "/dashboard/billing",
  "/dashboard/referrals",
];

export const ADMIN_DASHBOARD_PREFIXES: string[] = [
  "/dashboard/admin",
  "/dashboard/admin/requests",
  "/dashboard/admin/shifts",
  "/dashboard/admin/authorization",
  "/dashboard/admin/compliance",
  "/dashboard/admin/clients",
  "/dashboard/admin/workers",
  "/dashboard/referrals",
];

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