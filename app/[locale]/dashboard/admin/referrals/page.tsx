import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReferralsPage } from "@/features/referrals/components/referrals-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "referral.page" });
  return { title: t("title") };
}

export default function AdminReferralsRoute() {
  return <ReferralsPage role="admin" />;
}
