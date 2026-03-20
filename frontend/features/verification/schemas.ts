import { z } from "zod";



/** Validate Canadian phone number (10 digits, optionally with country code) */
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
    },
    { message: "Enter a valid 10-digit Canadian number" }
  );

/** 6-digit OTP code */
export const otpSchema = z
  .string()
  .length(6, "Enter the 6-digit code")
  .regex(/^\d{6}$/, "Code must be 6 digits");

export const phoneSendSchema = z.object({
  phone: phoneSchema,
});

export const phoneVerifySchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
});

export type PhoneSendInput = z.infer<typeof phoneSendSchema>;
export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;
