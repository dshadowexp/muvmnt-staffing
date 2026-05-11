import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PricingTiers } from "@/features/billing/components/pricing-tiers";
import { PricingStaffingSection } from "./_components/pricing-staffing-section";

type FaqItem = { q: string; a: string };

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing.meta");
  return { title: t("title"), description: t("description") };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const t = await getTranslations("pricing");

  const faqItems = t.raw("faq.items") as FaqItem[];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-12 md:px-6">

        {/* ══ Page hero ══════════════════════════════════════════════════════ */}
        <div className="mb-16 text-center">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {t("pageHero.title")}
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
            {t("pageHero.subtitle")}
          </p>
        </div>

        {/* ══ Section divider ════════════════════════════════════════════════ */}
        <div className="mb-16 flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("screeningSection.badge")}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* ══ SECTION A: Subscription Plans ═════════════════════════════════ */}
        <section className="mb-20">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
              {t("screeningSection.badge")}
            </Badge>
            <h2 className="mb-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {t("screeningSection.title")}
            </h2>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground">
              {t("screeningSection.subtitle")}
            </p>
          </div>

          {/* Subscription plan cards */}
          <PricingTiers />
        </section>

        {/* ══ Section divider ════════════════════════════════════════════════ */}
        <div className="mb-16 flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("staffing.badge")}
          </span>
          <Separator className="flex-1" />
        </div>

        <PricingStaffingSection />

        <div className="mb-16 flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("faq.badge")}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-xl font-semibold tracking-tight md:text-2xl">
              {t("faq.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("faq.subtitle")}</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

      </div>
    </div>
  );
}
