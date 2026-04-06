import { z } from "zod";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import type { ProfessionalRole } from "@/types";

export const WORKER_GENDERS = ["male", "female"] as const;
export type WorkerGender = (typeof WORKER_GENDERS)[number];

/** Latest birth date (local calendar) that is exactly `years` old or older as of today (local). */
export function getLatestAllowedWorkerBirthDate(years: number = 18): Date {
  const t = new Date();
  return new Date(t.getFullYear() - years, t.getMonth(), t.getDate());
}

/** `dateStr` is `yyyy-MM-dd` interpreted in local time. */
export function isWorkerMinimumAge(dateStr: string, years: number = 18): boolean {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, day] = parts;
  const birth = new Date(y, m - 1, day);
  if (
    birth.getFullYear() !== y ||
    birth.getMonth() !== m - 1 ||
    birth.getDate() !== day
  ) {
    return false;
  }
  return birth <= getLatestAllowedWorkerBirthDate(years);
}

export const workerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date")
    .refine(
      (val) => isWorkerMinimumAge(val),
      "You must be at least 18 years old",
    ),
  gender: z.enum(WORKER_GENDERS, {
    message: "Please select male or female",
  }),
  profession: z
    .string()
    .min(1, "Please select a profession")
    .refine(
      (val) => PROFESSIONAL_ROLES.includes(val as ProfessionalRole),
      "Please select a valid profession"
    ),
  yearsExp: z
    .number()
    .min(0, "Years must be 0 or more")
    .int("Must be a whole number"),
});

export type WorkerProfileValues = z.infer<typeof workerSchema>;

export type WorkerProfileFormInput = {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  profession: string;
  years_exp: number;
};

export function mapWorkerProfileToFormValues(
  row: WorkerProfileFormInput
): WorkerProfileValues {
  const g = row.gender;
  const gender =
    g === "male" || g === "female" ? g : ("" as WorkerGender);
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth ?? "",
    gender,
    profession: row.profession as ProfessionalRole,
    yearsExp: row.years_exp,
  };
}
