import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ReferralView } from "@/features/referrals/components/referral-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "referral.page" });
  return { title: t("title") };
}

export default async function ReferralsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "worker") redirect("/dashboard");
  
  const t = await getTranslations("referral.page");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            {t("title")}
          </h1>
        </div>

        <ReferralView role={session.role} />
      </div>
    );
}
