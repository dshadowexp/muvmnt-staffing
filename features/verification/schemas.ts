import { z } from "zod";

type PhoneValidationKey =
  | "phoneRequired"
  | "phoneInvalid"
  | "codeLength"
  | "codeDigits";

export type PhoneCountry = "CA" | "US" | "UK";

/** Valid national-number digit lengths per supported country. */
const COUNTRY_DIGIT_RULES: Record<PhoneCountry, (digits: string) => boolean> = {
  CA: (d) => d.length === 10 || (d.length === 11 && d.startsWith("1")),
  US: (d) => d.length === 10 || (d.length === 11 && d.startsWith("1")),
  UK: (d) => {
    const stripped = d.replace(/^0+/, "");
    return stripped.length === 10 || d.length === 10;
  },
};

/** Build a localized phone schema. `t` maps to `kyc.onboarding.validation`. */
export function buildPhoneSchema(
  t?: (key: PhoneValidationKey) => string,
  country: PhoneCountry = "CA",
) {
  const msg = (key: PhoneValidationKey) => (t ? t(key) : key);
  const isValid = COUNTRY_DIGIT_RULES[country];
  return z
    .string()
    .min(1, msg("phoneRequired"))
    .refine(
      (v) => isValid(v.replace(/\D/g, "")),
      { message: msg("phoneInvalid") },
    );
}

/** Build a localized 6-digit OTP schema. */
export function buildOtpSchema(t?: (key: PhoneValidationKey) => string) {
  const msg = (key: PhoneValidationKey) => (t ? t(key) : key);
  return z
    .string()
    .length(6, msg("codeLength"))
    .regex(/^\d{6}$/, msg("codeDigits"));
}

/** Validate Canadian phone number (10 digits, optionally with country code) */
export const phoneSchema = buildPhoneSchema();

/** 6-digit OTP code */
export const otpSchema = buildOtpSchema();

export const phoneSendSchema = z.object({
  phone: phoneSchema,
});

export const phoneVerifySchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
});

export type PhoneSendInput = z.infer<typeof phoneSendSchema>;
export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;
