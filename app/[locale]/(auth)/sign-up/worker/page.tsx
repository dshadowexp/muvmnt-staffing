import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { SignUpForm } from "@/features/auth/forms/sign-up-form";
 
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.signUp.meta" });
  return {
    title: `${t("titleWorker")} | ${SITE_NAME}`,
    description: t("descriptionWorker"),
  };
}
 
export default function SignUpWorkerPage() {
  return <SignUpForm role="worker" />;
}
 