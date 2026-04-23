import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReferralContent } from "./referral-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "referral.page" });
  return { title: t("title") };
}

export default async function ReferralPage() {
  const t = await getTranslations("referral.page");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("title")}</h1>
      </div>

      <ReferralContent />
    </div>
  );
}
