import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { OperatorSignInForm } from "@/features/auth/forms/operator-sign-in-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.signIn.meta" });
  return {
    title: `Operator Sign In | ${SITE_NAME}`,
    description: t("description"),
  };
}

export default function SignInOperatorPage() {
  return <OperatorSignInForm />;
}
