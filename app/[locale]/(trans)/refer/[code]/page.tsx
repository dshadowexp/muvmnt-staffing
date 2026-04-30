import type { Locale } from "next-intl";
import { ClaimReferralRedirect } from "./_client";

export const dynamic = "force-dynamic";

export default async function ReferralCodePage({
  params,
}: {
  params: Promise<{ code: string; locale: Locale }>;
}) {
  const { code, locale } = await params;
  return <ClaimReferralRedirect code={code} locale={locale} />;
}
