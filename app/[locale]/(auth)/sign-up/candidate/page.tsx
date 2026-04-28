import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { CandidateSignUpForm } from "@/features/auth/forms/candidate-sign-up-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.signUp.meta" });
  return {
    title: `${t("titleCandidate")} | ${SITE_NAME}`,
    description: t("descriptionCandidate"),
  };
}

export default function SignUpCandidatePage() {
  return <CandidateSignUpForm />;
}
