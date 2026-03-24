import { z } from "zod";

const emailSchema = z
  .email("Please enter a valid email address");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .refine((p) => p.length >= 8, "Use 8+ characters for a stronger password")
    .refine((p) => /[A-Z]/.test(p), "Include at least one uppercase letter")
    .refine((p) => /[0-9]/.test(p), "Include at least one number")
    .refine((p) => /[^A-Za-z0-9]/.test(p), "Include at least one special character"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
