import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign In | ${SITE_NAME}`,
  description: "Sign in to your Muvmnt account. Access your staffing requests and account details.",
};

export default function SignInPage() {
  return <SignInForm />;
}
