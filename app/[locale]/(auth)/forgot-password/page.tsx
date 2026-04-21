import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/features/auth/forms/reset-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgot.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ForgotPasswordPage() {
  return <ResetPasswordForm />;
}
