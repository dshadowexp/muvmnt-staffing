import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { ClientEmailLinkVerifyForm } from "@/features/auth/forms/client-email-link-verify-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.verify" });
  return {
    title: `${t("metaTitle")} | ${SITE_NAME}`,
    description: t("metaDescription"),
  };
}

export default function SignUpOperatorVerifyPage() {
  return <ClientEmailLinkVerifyForm />;
}
