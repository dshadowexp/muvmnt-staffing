import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign Up | ${SITE_NAME}`,
  description: "Create your free Muvmnt account. Join as a healthcare worker or staffing facility.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
