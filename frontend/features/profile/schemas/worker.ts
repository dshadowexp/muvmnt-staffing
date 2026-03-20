import { z } from "zod";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import type { ProfessionalRole } from "@/types";

export const workerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date"),
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
  profession: string;
  years_exp: number;
};

export function mapWorkerProfileToFormValues(
  row: WorkerProfileFormInput
): WorkerProfileValues {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth ?? "",
    profession: row.profession as ProfessionalRole,
    yearsExp: row.years_exp,
  };
}
