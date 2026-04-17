import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
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

      <section className="relative overflow-hidden border-b bg-[var(--charcoal)] px-6 pb-16 pt-10 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.12)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-8 flex items-center gap-2 text-xs font-light text-white/35">
            <Link
              href="/"
              className="text-white/40 no-underline transition-colors hover:text-white/60"
            >
              {tCommon("home")}
            </Link>
            <span>/</span>
            <span className="text-primary">{t("breadcrumb")}</span>
          </div>

          <h1 className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/65">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
        <FaqAccordion items={items} />

        <div className="mt-14 rounded-2xl border bg-muted/30 px-6 py-8 text-center">
          <p className="mb-4 text-sm font-medium text-foreground">
            {t("cta.title")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/find-staff">{t("cta.primary")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/find-work">{t("cta.secondary")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
