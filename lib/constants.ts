import type {
  ProfessionalRole, Province, AvailabilityType,
  WorkSetting, FormStep, RequesterType, ShiftType, RequestUrgency,
  WorkAuthorization,
} from "@/types";

// ── Site ─────────────────────────────────────────────────────────────────────
// Brand / contact data. Localized copy lives in messages/{locale}.json.
export const SITE_NAME  = "Muvmnt";
export const SITE_PHONE = "1-437-979-7797";
export const SITE_EMAIL = "info@muvmnt.ca";
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

/** Authenticated route prefixes (locale stripped by proxy). Use absolute paths. */
export const ADMIN_PREFIXES: string[] = ["/admin"];

export const AUTH_PREFIXES: string[] = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
];

export const WORKER_PREFIXES: string[] = [
  "/worker",
  "/onboarding",
  "/review",
  "/interviews",
  "/quizes",
];

export const CLIENT_PREFIXES: string[] = [
  "/client",
  "/onboarding",
  "/review",
];

export const INACTIVE_PREFIXES: string[] = [
  "/onboarding",
  "/review",
];

// ── Professional (Find Work) ──────────────────────────────────────────────────
export const WORK_AUTHORIZATION_TYPES: WorkAuthorization[] = [
  "Canadian Citizen",
  "Permanent Resident",
  "Open Work Permit",
  "Closed Work Permit",
  "Study Permit (with work authorization)",
];



/**
 * Canonical catalogue of skills a worker can claim. Each entry has a concise
 * description surfaced in the "Add skill" flow and used when generating quiz
 * questions. Skills have no uploaded document — compliance documents (with
 * `file_url` / `is_verified`) live in the `compliances` table.
 */
export const SKILL_CATALOG = [
  {
    name: "Medication Administration",
    description:
      "Safe medication handling: the five rights, documentation, and routes of administration within scope of practice.",
  },
] as const;

export const SKILL_NAMES = SKILL_CATALOG.map(
  (c) => c.name,
) as readonly (typeof SKILL_CATALOG)[number]["name"][];

export type SkillName = (typeof SKILL_CATALOG)[number]["name"];

export function getSkillDescription(name: string): string | undefined {
  return SKILL_CATALOG.find((c) => c.name === name)?.description;
}

export const COMPLIANCE_CATALOG = [
  {
    name: "CPR",
    description:
      "Cardiopulmonary resuscitation — chest compressions, rescue breathing, and AED use during cardiac emergencies.",
  },
  {
    name: "First Aid",
    description:
      "Responding to injuries, bleeding, burns, and sudden illness until advanced medical help arrives.",
  },
  {
    name: "N95 Mask Fit Test",
    description:
      "Respirator fit test confirming an airtight seal on an N95 for aerosol-generating procedures.",
  },
  {
    name: "Covid-19 Vaccination",
    description:
      "Proof of COVID-19 vaccination required by many healthcare settings for infection prevention.",
  },
  {
    name: "Criminal Record Check",
    description:
      "Recent police background check confirming no disqualifying offences.",
  },
  {
    name: "Vulnerable Sector Check",
    description:
      "Enhanced screening required to work with children, seniors, or vulnerable adults.",
  },
  {
    name: "TB Test",
    description:
      "Two-step tuberculosis skin test or equivalent medical clearance.",
  },
  {
    name: "Immunization Record",
    description:
      "Proof of up-to-date immunizations (MMR, Tdap, varicella, hepatitis B, influenza).",
  },
  {
    name: "WES",
    description:
      "World Education Services credential evaluation mapping international qualifications to Canadian equivalents.",
  },
  {
    name: "Driver's License",
    description:
      "Valid provincial driver's license for roles that involve travel or client transport.",
  },
  {
    name: "Diploma / Degree",
    description:
      "Highest education credential relevant to the role (e.g. BScN, PSW certificate).",
  },
  {
    name: "SIN Document",
    description:
      "Social Insurance Number confirmation letter or card for payroll eligibility.",
  },
] as const;

export const COMPLIANCE_NAMES = COMPLIANCE_CATALOG.map(
  (c) => c.name,
) as readonly (typeof COMPLIANCE_CATALOG)[number]["name"][];

export type ComplianceName = (typeof COMPLIANCE_CATALOG)[number]["name"];

export function getComplianceDescription(name: string): string | undefined {
  return COMPLIANCE_CATALOG.find((c) => c.name === name)?.description;
}

export const PROFESSIONAL_ROLES: ProfessionalRole[] = [
  "RN",
  "RPN",
  "PSW",
  "Healthcare Support Worker",
  "Allied Health Practitioner",
  "DSW",
  "Cook / Dietary Aide",
  "Other",
];

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

// ── Job tasks ─────────────────────────────────────────────────────────────────
export const JOB_TASKS = [
  "Vital Signs Monitoring",
  "Medication Administration",
  "Blood Glucose Monitoring",
  "Wound Care",
  "Patient Bathing",
  "Grooming Assistance",
  "Toileting Assistance",
  "Feeding Assistance",
  "Mobility Assistance",
  "Patient Transfers",
  "Repositioning Patients",
  "Fall Prevention Monitoring",
  "1:1 Patient Observation",
  "Dementia Care Support",
  "Meal Distribution",
  "Room Cleaning / Sanitation",
  "Stocking Medical Supplies",
  "Wheelchair Transport",
  "Electronic Charting",
  "Shift Handover Reporting",
  "Infection Control Protocols",
  "Emergency Response Assistance",
] as const;

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