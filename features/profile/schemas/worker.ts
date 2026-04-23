import { z } from "zod";
import { normalizeProfessionId, tryNormalizeProfessionId } from "@/lib/professions";
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

/** Keys under `kyc.onboarding.validation`. Translator must map them to locale strings. */
type WorkerValidationKey =
  | "firstNameRequired"
  | "lastNameRequired"
  | "dateOfBirthRequired"
  | "invalidDate"
  | "minAge18"
  | "genderRequired"
  | "professionRequired"
  | "professionInvalid"
  | "yearsMin"
  | "yearsInt";

/**
 * Build a localized worker schema. Pass a translator scoped to
 * `kyc.onboarding.validation`; omit for the server-side default (English keys).
 */
export function buildWorkerSchema(t?: (key: WorkerValidationKey) => string) {
  const msg = (key: WorkerValidationKey) => (t ? t(key) : key);
  return z.object({
    firstName: z.string().min(1, msg("firstNameRequired")),
    lastName: z.string().min(1, msg("lastNameRequired")),
    dateOfBirth: z
      .string()
      .min(1, msg("dateOfBirthRequired"))
      .refine((val) => !Number.isNaN(Date.parse(val)), msg("invalidDate"))
      .refine((val) => isWorkerMinimumAge(val), msg("minAge18")),
    gender: z.enum(WORKER_GENDERS, { message: msg("genderRequired") }),
    profession: z
      .string()
      .min(1, msg("professionRequired"))
      .refine(
        (val) => tryNormalizeProfessionId(val) !== null,
        msg("professionInvalid"),
      ),
    yearsExp: z
      .number()
      .min(0, msg("yearsMin"))
      .int(msg("yearsInt")),
  });
}

export const workerSchema = buildWorkerSchema();

export type WorkerProfileValues = z.infer<typeof workerSchema>;

/** Account settings: only profession and experience may be edited after onboarding. */
export const workerProfessionExperienceSchema = z.object({
  profession: workerSchema.shape.profession,
  yearsExp: workerSchema.shape.yearsExp,
});

export type WorkerProfessionExperienceValues = z.infer<
  typeof workerProfessionExperienceSchema
>;

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
    profession: normalizeProfessionId(row.profession),
    yearsExp: row.years_exp,
  };
}
