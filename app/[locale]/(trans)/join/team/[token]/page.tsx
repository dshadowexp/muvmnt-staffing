import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { previewFacilityTeamInviteAction } from "@/features/account/actions/invite";
import { JoinTeamClient } from "./_client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.joinTeam.meta" });
  return {
    title: `${t("title")} | ${SITE_NAME}`,
    description: t("description"),
  };
}

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const preview = await previewFacilityTeamInviteAction(token);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <JoinTeamClient token={token} preview={preview} />
    </div>
  );
}
