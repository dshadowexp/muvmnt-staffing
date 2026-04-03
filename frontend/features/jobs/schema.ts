import { z } from "zod";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import type { ProfessionalRole } from "@/types";
import type { Database } from "@/services/supabase/types/database";

const professionalRoleSchema = z.enum(
  PROFESSIONAL_ROLES as unknown as [ProfessionalRole, ...ProfessionalRole[]],
);

const staffRequestFields = {
  profession: z
    .union([professionalRoleSchema, z.literal("")])
    .refine((v) => v !== "", { message: "Select a profession" }),
  startDate: z.date({ error: "Start date is required" }),
  endDate: z.date().optional().nullable(),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time (use HH:mm)"),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time (use HH:mm)"),
  requirements: z.array(z.string().min(1)).default([]),
  tasks: z.array(z.string().min(1)).default([]),
  positions: z.coerce.number().int().min(1, "At least 1 position required"),
  notes: z.string().optional(),
};

/** Minimum wage floor for validation — hourly rate is unset in DB until pricing is accepted */
const MIN_HOURLY = 15;

/** New staff request (step 1) — hourly rate is set after pricing is accepted */
export const staffRequestCreateSchema = z
  .object(staffRequestFields)
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      return endMins > startMins;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type StaffRequestCreateValues = z.infer<typeof staffRequestCreateSchema>;

/** Full form including hourly rate (editing an existing request) */
export const jobFormSchema = z
  .object({
    ...staffRequestFields,
    hourlyRate: z.coerce
      .number({ error: "Enter an hourly rate" })
      .min(MIN_HOURLY, "Hourly rate must be above minimum wage"),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      return endMins > startMins;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type JobFormValues = z.infer<typeof jobFormSchema>;

type JobInfoRow = Database["public"]["Tables"]["job_infos"]["Row"];

export type JobInfoFormInput = Pick<
  JobInfoRow,
  | "id"
  | "profession"
  | "start_date"
  | "end_date"
  | "start_time"
  | "end_time"
  | "requirements"
  | "tasks"
  | "hourly_rate"
  | "positions"
  | "notes"
>;

/** Normalize DB time (e.g. "09:00:00") to HH:mm for HTML time inputs */
function normalizeTimeForInput(time: string | null | undefined, fallback: string): string {
  if (!time || typeof time !== "string") return fallback;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = String(parseInt(match[1], 10)).padStart(2, "0");
  const m = String(parseInt(match[2], 10)).padStart(2, "0");
  return `${h}:${m}`;
}

export function mapJobInfoToFormValues(row: JobInfoFormInput): JobFormValues {
  const rate = row.hourly_rate;
  const pendingRate = rate == null || rate <= 0;
  return {
    profession: row.profession as ProfessionalRole,
    startDate: new Date(row.start_date),
    endDate: row.end_date ? new Date(row.end_date) : null,
    startTime: normalizeTimeForInput(row.start_time, "09:00"),
    endTime: normalizeTimeForInput(row.end_time, "17:00"),
    requirements: row.requirements ?? [],
    tasks: row.tasks ?? [],
    hourlyRate: pendingRate ? MIN_HOURLY : rate,
    positions: row.positions,
    notes: row.notes ?? "",
  };
}
