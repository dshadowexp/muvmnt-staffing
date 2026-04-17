import { z } from "zod";
import { WORK_AUTHORIZATION_TYPES } from "@/lib/constants";
import type { WorkAuthorization } from "@/types";

type AuthorizationValidationKey =
  | "workAuthorizationRequired"
  | "workAuthorizationInvalid";

/** Build a localized authorization schema (see `kyc.onboarding.validation`). */
export function buildAuthorizationSchema(
  t?: (key: AuthorizationValidationKey) => string,
) {
  const msg = (key: AuthorizationValidationKey) => (t ? t(key) : key);
  return z.object({
    workAuthorization: z
      .string()
      .min(1, msg("workAuthorizationRequired"))
      .refine(
        (val) => WORK_AUTHORIZATION_TYPES.includes(val as WorkAuthorization),
        msg("workAuthorizationInvalid"),
      ),
  });
}

export const authorizationSchema = buildAuthorizationSchema();

export type AuthorizationFormValues = z.infer<typeof authorizationSchema>;
