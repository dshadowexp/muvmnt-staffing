export interface FormErrors {
  [key: string]: string | undefined;
}

export type WorkAuthorization =
  | "Canadian Citizen"
  | "Permanent Resident"
  | "Open Work Permit"
  | "Closed Work Permit"
  | "Study Permit (with work authorization)";

import type { ProfessionalRole } from "@/lib/professions";

export type { ProfessionalRole } from "@/lib/professions";

export type Province =
  | "Ontario"
  | "Alberta"
  | "British Columbia"
  | "Nova Scotia"
  | "New Brunswick"
  | "Prince Edward Island"
  | "Newfoundland & Labrador"
  | "Manitoba"
  | "Saskatchewan"
  | "Quebec";

export type AvailabilityType = "Full-Time" | "Part-Time" | "Casual / Relief" | "Travel";

export type WorkSetting =
  | "Long-Term Care"
  | "Hospital"
  | "Home Care"
  | "Retirement Community"
  | "Community Clinic"
  | "Rehabilitation Centre";

export interface ProfessionalApplication {
  // Step 1 - Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  province: Province | "";

  // Step 2 - Professional Info
  role: ProfessionalRole | "";
  yearsExperience: string;
  licenseNumber: string;
  availability: AvailabilityType[];
  workSettings: WorkSetting[];

  // Step 3 - Resume + Message
  resumeFile: File | null;
  coverMessage: string;

  // Meta
  agreeToTerms: boolean;
}

export interface FormStep {
  id: number;
  title: string;
  description: string;
}

// ── Talent Request (Find Talent / Client side) ────────────────────────────

/**
 * RequesterType drives the labels, placeholders, and optional fields
 * across the whole form. "Individual" covers personal home-care requests.
 */
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

export type ShiftType = "Day" | "Evening" | "Night" | "Rotating" | "Flexible";

export type RequestUrgency = "Emergency (today)" | "Within 48 hours" | "This week" | "Planning ahead";

export interface ShiftRequest {
  id: string;                      // client-side uuid
  role: ProfessionalRole | "";
  staffCount: string;              // "1", "2–5", "6–10", "10+"
  shiftType: ShiftType[];
  startDate: string;               // ISO date string
  endDate: string;                 // ISO date string (can equal startDate for single day)
  notes: string;                   // special requirements for this role
}

export interface TalentRequest {
  // Step 1 — Requester info (merged org + contact, no redundancy)
  requesterType: RequesterType | "";
  organizationName: string;     // empty when requesterType === "Individual / Private Home Care"
  contactName: string;
  contactTitle: string;         // empty for Individual
  contactEmail: string;
  contactPhone: string;
  city: string;
  province: Province | "";
  address: string;              // optional for all

  // Step 2 — Shift requests
  shiftRequests: ShiftRequest[];

  // Step 3 — Urgency + notes + terms
  urgency: RequestUrgency | "";
  additionalNotes: string;
  agreeToTerms: boolean;
}

