import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { CandidateSignInForm } from "@/features/auth/forms/candidate-sign-in-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.candidateSignIn.meta" });
  return {
    title: `${t("title")} | ${SITE_NAME}`,
    description: t("description"),
  };
}

export default function CandidateSignInPage() {
  return <CandidateSignInForm />;
}

