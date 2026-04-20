import { z } from "zod";
import { WORK_AUTHORIZATION_TYPES } from "@/lib/constants";
import type { WorkAuthorization } from "@/types";

type AuthorizationValidationKey =
  | "workAuthorizationRequired"
  | "workAuthorizationInvalid"
  | "socialNumberRequired"
  | "socialNumberInvalid"
  | "socialNumberExpiryRequired"
  | "socialNumberExpiryInvalid"
  | "socialNumberExpiryPast";

/**
 * Authorization types whose holder must provide an expiry for the SIN they
 * receive. Canadian Citizens and Permanent Residents have permanent SINs.
 */
const PERMIT_TYPES_REQUIRING_SIN_EXPIRY: ReadonlySet<WorkAuthorization> =
  new Set<WorkAuthorization>([
    "Open Work Permit",
    "Closed Work Permit",
    "Study Permit (with work authorization)",
  ]);

/** Whether a given work authorization type carries a SIN expiry date. */
export function requiresSinExpiry(
  type: WorkAuthorization | string | null | undefined,
): boolean {
  if (!type) return false;
  return PERMIT_TYPES_REQUIRING_SIN_EXPIRY.has(type as WorkAuthorization);
}

/** Strip non-digits from a SIN entry; helpful for display + storage. */
export function normalizeSocialNumber(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

/** Format a 9-digit SIN as `123-456-789` for display. */
export function formatSocialNumber(value: string | null | undefined): string {
  const digits = normalizeSocialNumber(value);
  if (digits.length !== 9) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
}

/** Mask all but the last three digits of a SIN: `***-***-789`. */
export function maskSocialNumber(value: string | null | undefined): string {
  const digits = normalizeSocialNumber(value);
  if (digits.length !== 9) return digits ? "•••" : "";
  return `•••-•••-${digits.slice(6, 9)}`;
}

/** Parse `yyyy-MM-dd` as a local date so it doesn't shift across timezones. */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * The SIN field is permanent once persisted. The only time we let it change is
 * when the holder has a permit-issued SIN and the recorded expiry is in the
 * past (i.e. they've renewed their status and received a new SIN).
 */
export function canEditSocialNumber(args: {
  socialNumber?: string | null;
  socialNumberExpiry?: string | null;
}): boolean {
  const existing = normalizeSocialNumber(args.socialNumber);
  if (!existing) return true;
  if (!args.socialNumberExpiry) return false;
  const expiry = parseLocalDate(args.socialNumberExpiry);
  if (Number.isNaN(expiry.getTime())) return false;
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return expiry < todayStart;
}

/** Build a localized authorization schema (see `kyc.onboarding.validation`). */
export function buildAuthorizationSchema(
  t?: (key: AuthorizationValidationKey) => string,
) {
  const msg = (key: AuthorizationValidationKey) => (t ? t(key) : key);
  return z
    .object({
      workAuthorization: z
        .string()
        .min(1, msg("workAuthorizationRequired"))
        .refine(
          (val) => WORK_AUTHORIZATION_TYPES.includes(val as WorkAuthorization),
          msg("workAuthorizationInvalid"),
        ),
      socialNumber: z
        .string()
        .min(1, msg("socialNumberRequired"))
        .transform((v) => normalizeSocialNumber(v))
        .refine((v) => v.length === 9, msg("socialNumberInvalid")),
      socialNumberExpiry: z
        .string()
        .optional()
        .or(z.literal(""))
        .transform((v) => (v ? v : undefined)),
    })
    .superRefine((values, ctx) => {
      const needsExpiry = requiresSinExpiry(values.workAuthorization);
      if (!needsExpiry) return;

      const expiry = values.socialNumberExpiry;
      if (!expiry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["socialNumberExpiry"],
          message: msg("socialNumberExpiryRequired"),
        });
        return;
      }

      const parsed = parseLocalDate(expiry);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["socialNumberExpiry"],
          message: msg("socialNumberExpiryInvalid"),
        });
        return;
      }

      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      if (parsed < todayStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["socialNumberExpiry"],
          message: msg("socialNumberExpiryPast"),
        });
      }
    });
}

export const authorizationSchema = buildAuthorizationSchema();

export type AuthorizationFormValues = z.input<typeof authorizationSchema>;
export type AuthorizationFormParsed = z.output<typeof authorizationSchema>;
