import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalWrapper, {
  type LegalSection,
} from "@/app/[locale]/(landing)/(legal)/_components/legal-wrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PrivacyPage() {
  const tLegal = await getTranslations("legal");
  const tPrivacy = await getTranslations("legal.privacy");
  const tCommon = await getTranslations("common");

  const sections = tPrivacy.raw("sections") as LegalSection[];
  const related = tPrivacy.raw("related") as { label: string; href: string };

  return (
    <LegalWrapper
      title={tPrivacy("title")}
      subtitle={tPrivacy("subtitle")}
      effectiveDate={tPrivacy("effective")}
      lastUpdated={tPrivacy("updated")}
      sections={sections}
      related={related}
      contactEmail={tPrivacy("contactEmail")}
      strings={{
        breadcrumb: tPrivacy("title"),
        home: tCommon("home"),
        badge: tLegal("badge"),
        jurisdiction: tLegal("jurisdiction"),
        effectiveLabel: tLegal("effectiveLabel"),
        updatedLabel: tLegal("updatedLabel"),
        contactHeading: tLegal("contactHeading"),
        contactBody: tLegal("contactBody"),
        disclaimer: tLegal("disclaimer"),
      }}
    />
  );
}
