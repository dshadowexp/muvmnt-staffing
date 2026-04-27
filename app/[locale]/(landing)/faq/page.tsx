import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ctaPrimary, ctaOutline } from "../_lib/cta-classes";
import { FaqAccordion } from "./_components/faq-accordion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

type FaqItem = { id: string; question: string; answer: string };

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const tCommon = await getTranslations("common");
  const items = t.raw("items") as FaqItem[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative overflow-hidden border-b bg-background px-6 pb-16 pt-10 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_85%_30%,oklch(0.527_0.154_150.069/0.06),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-8 flex items-center gap-2 text-xs font-light text-muted-foreground/70">
            <Link
              href="/"
              className="text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              {tCommon("home")}
            </Link>
            <span>/</span>
            <span className="text-primary">{t("breadcrumb")}</span>
          </div>

          <h1 className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
        <FaqAccordion items={items} />

        <div className="mt-14 rounded-2xl border bg-card px-6 py-8 text-center shadow-sm">
          <p className="mb-4 text-sm font-medium text-foreground">
            {t("cta.title")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/find-staff" className={ctaPrimary}>{t("cta.primary")}</Link>
            <Link href="/find-work" className={ctaOutline}>{t("cta.secondary")}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
