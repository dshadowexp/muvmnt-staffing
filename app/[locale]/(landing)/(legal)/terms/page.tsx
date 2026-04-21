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
  const t = await getTranslations({ locale, namespace: "legal.terms.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TermsPage() {
  const tLegal = await getTranslations("legal");
  const tTerms = await getTranslations("legal.terms");
  const tCommon = await getTranslations("common");

  const sections = tTerms.raw("sections") as LegalSection[];
  const related = tTerms.raw("related") as { label: string; href: string };

  return (
    <LegalWrapper
      title={tTerms("title")}
      subtitle={tTerms("subtitle")}
      effectiveDate={tTerms("effective")}
      lastUpdated={tTerms("updated")}
      sections={sections}
      related={related}
      contactEmail={tTerms("contactEmail")}
      strings={{
        breadcrumb: tTerms("title"),
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
