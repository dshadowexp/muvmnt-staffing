import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset Password | ${SITE_NAME}`,
  description: "Reset your password. Enter your email to receive a reset link.",
};

export default function ForgotPasswordPage() {
  return <ResetPasswordForm />;
}
