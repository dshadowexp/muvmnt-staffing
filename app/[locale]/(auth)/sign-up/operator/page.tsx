import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { OperatorSignUpForm } from "@/features/auth/forms/operator-sign-up-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.signUp.meta" });
  return {
    title: `${t("titleClient")} | ${SITE_NAME}`,
    description: t("descriptionClient"),
  };
}

export default function SignUpOperatorPage() {
  return <OperatorSignUpForm />;
}
