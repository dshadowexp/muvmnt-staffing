import { z } from "zod";

type PhoneValidationKey =
  | "phoneRequired"
  | "phoneInvalid"
  | "codeLength"
  | "codeDigits";

/** Build a localized phone schema (Canadian). `t` maps to `kyc.onboarding.validation`. */
export function buildPhoneSchema(t?: (key: PhoneValidationKey) => string) {
  const msg = (key: PhoneValidationKey) => (t ? t(key) : key);
  return z
    .string()
    .min(1, msg("phoneRequired"))
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "");
        return (
          digits.length === 10 ||
          (digits.length === 11 && digits.startsWith("1"))
        );
      },
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
