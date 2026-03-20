import type {
  ProfessionalRole, Province, AvailabilityType,
  WorkSetting, FormStep, RequesterType, ShiftType, RequestUrgency,
  WorkAuthorization,
} from "@/types";

// ── Site ─────────────────────────────────────────────────────────────────────
export const SITE_NAME     = "Muvmnt";
export const SITE_TAGLINE  = "Healthcare Staffing Solutions";
export const SITE_PHONE    = "1-437-979-7797";
export const SITE_EMAIL    = "info@muvmnt.ca";
export const SITE_PROVINCES = "Ontario";
export const PUBLIC_PATHS: string[] = [
  "/",
  "/find-work",
  "/careers",
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
  "/find-work",
  "/find-talent",
  "/privacy",
  "/terms",
];

// ── Navigation ────────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: "Services",    href: "/#services" },
  { label: "How It Works", href: "/#how" },
  { label: "Why Us",      href: "/#why" },
  // { label: "Contact",     href: "/#contact" },
] as const;

// ── Professional (Find Work) ──────────────────────────────────────────────────
export const WORK_AUTHORIZATION_TYPES: WorkAuthorization[] = [
  "Canadian Citizen",
  "Permanent Resident",
  "Open Work Permit",
  "Closed Work Permit",
  "Study Permit (with work authorization)",
];

export const CERTIFICATION_NAMES = [
  "CPR",
  "First Aid",
  "PSW Certificate",
  "Resume",
  "Medication Administration",
  "Covid-19 Vaccination",
  "G2 Driver's License",
  "N95 Mask Fit Test",
  "WES"
] as const;

export type CertificationName = (typeof CERTIFICATION_NAMES)[number];

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
  "Individual / Private Home Care",
  "Other",
];

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

// ── Landing page data ─────────────────────────────────────────────────────────
export const HERO_STATS = [
  { value: "500+", label: "Facilities Served" },
  { value: "98%",  label: "Fill Rate" },
  { value: "<2h",  label: "Avg Response" },
] as const;

export const SERVICES = [
  {
    icon: "Hospital" as const,
    title: "Temporary & Relief Staffing",
    description:
      "Rapid deployment of qualified healthcare professionals to cover sick leave, maternity/paternity leave, and unexpected absences — 24/7, province-wide.",
    tags: ["Same-Day Placement", "RN · RPN · PSW", "Long-Term Care", "Hospitals", "Clinics"],
  },
  {
    icon: "House" as const,
    title: "Home Care Staffing",
    description:
      "Compassionate, pre-screened personal support workers and healthcare aides placed directly in client homes to deliver consistent, high-quality care.",
    tags: ["PSW Placement", "Elderly Care", "Post-Surgical", "Ongoing Support"],
  },
] as const;

export const HOW_STEPS = [
  { num: "01", title: "Submit Your Request",  description: "Tell us your staffing needs, shift requirements, and preferred qualifications through our streamlined intake process." },
  { num: "02", title: "We Match & Screen",    description: "Our team rapidly identifies best-fit candidates from our pre-vetted pool of credentialed healthcare professionals." },
  { num: "03", title: "Confirm & Deploy",     description: "Review your matched professionals and confirm placement. We handle all onboarding logistics." },
  { num: "04", title: "Ongoing Support",      description: "We follow up to ensure satisfaction and maintain a continuous pipeline for your future staffing needs." },
] as const;

export const WHY_POINTS = [
  { icon: "Zap" as const, title: "Rapid Deployment", description: "We fill positions faster than anyone in the industry — including same-day emergency coverage." },
  { icon: "BadgeCheck" as const, title: "Rigorously Vetted Talent", description: "Every professional is credentialed, reference-checked, and thoroughly screened before joining our roster." },
  { icon: "MapPin" as const, title: "Province-Wide Coverage", description: "Active placements across Ontario — from Toronto to Ottawa, the GTA, and beyond." },
  { icon: "MessageCircle" as const, title: "Dedicated Account Support", description: "A single point of contact who knows your facility, your standards, and your culture." },
] as const;

export const TESTIMONIALS = [
  { stars: 5, text: "Muvmnt filled three last-minute RN positions over the holiday weekend. I don't know what we would have done without them.", name: "Sandra K.",  role: "Director of Care, LTC Facility — Toronto" },
  { stars: 5, text: "The PSWs they send are always professional and prepared. Our residents have commented on the consistency and warmth of care.",  name: "James L.",  role: "Administrator, Retirement Community — Calgary" },
  { stars: 5, text: "Onboarding was seamless. Within 48 hours we had vetted, experienced staff on the floor. Genuinely impressive.",                  name: "Maria T.",  role: "HR Manager, Community Health Centre — Vancouver" },
] as const;

export const TRUST_LOGOS = [
  "Ontario LTC Association",
  "OLTCA",
  "Home Care Ontario",
  "HealthForceOntario",
  "CRNBC",
] as const;