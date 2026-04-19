import { ProfessionalRole } from "@/types";

export type ShiftType = "Day" | "Evening" | "Night" | "Rotating" | "Flexible";

export interface ShiftRequest {
    id: string;                      // client-side uuid
    role: ProfessionalRole | "";
    staffCount: string;              // "1", "2–5", "6–10", "10+"
    shiftType: ShiftType[];
    startDate: string;               // ISO date string
    endDate: string;                 // ISO date string (can equal startDate for single day)
    notes: string;                   // special requirements for this role
  }