import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ReviewClient from "./_client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kyc.review.meta" });
  return { title: t("title") };
}

export default async function ReviewPage() {
  return (
    <ReviewClient />
  );
}
