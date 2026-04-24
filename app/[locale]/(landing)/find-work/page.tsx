import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarClock,
  DollarSign,
  Headset,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { LandingAuthCtas } from "../_components/landing-auth-ctas";
import { Button } from "@/components/ui/button";
import { HowItWorks } from "./_how-it-works";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "findWork.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/find-work" },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

const PERK_ICONS: Record<string, LucideIcon> = {
  Zap,
  CalendarClock,
  DollarSign,
  Headset,
};

type Perk = { icon: string; title: string; description: string };
type Role = { abbr: string; full: string };

export default async function FindWorkPage() {
  const t = await getTranslations("findWork");
  const tCommon = await getTranslations("common");
  const perks = t.raw("perks") as Perk[];
  const roles = t.raw("roles") as Role[];

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 pb-20 pt-10 lg:px-12 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.15)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-5xl">
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

          <div className="max-w-2xl">
            <Badge className="mb-6 gap-1.5 border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] text-[var(--teal-mid)]">
              {t("badge")}
            </Badge>

            <h1 className="mb-5 font-[var(--font-display)] text-[clamp(2.2rem,4vw,3.4rem)] font-extrabold leading-[1.08] tracking-tight text-white">
              {t("titleLead")}{" "}
              <span className="text-[var(--teal-mid)]">{t("titleAccent")}</span>{" "}
              {t("titleTail")}
            </h1>

            <p className="mb-8 text-base font-light leading-[1.7] text-white/65">
              {t("subtitle")}
            </p>

            <LandingAuthCtas
              signUpHref="/sign-up?as=worker"
              ctaCreateLabel={t("ctaCreate")}
              ctaSignInLabel={t("ctaSignIn")}
              variant="onDark"
            />
          </div>
        </div>
      </section>

      <section className="bg-background px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
              {t("perksOverline")}
            </p>
            <h2 className="font-[var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold tracking-tight text-foreground">
              {t("perksTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((p) => {
              const Icon = PERK_ICONS[p.icon] ?? Zap;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <p className="mb-1.5 font-[var(--font-display)] text-base font-bold text-card-foreground">
                    {p.title}
                  </p>
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <HowItWorks />

      <section className="border-t bg-muted/40 px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
                {t("rolesOverline")}
              </p>
              <h2 className="font-[var(--font-display)] text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold tracking-tight text-foreground">
                {t("rolesTitle")}
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link href="/faq">
                {t("seeFaq")}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <span
                key={r.abbr}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <span className="font-[var(--font-display)] text-xs font-extrabold text-primary">
                  {r.abbr}
                </span>
                <span className="text-xs text-muted-foreground">{r.full}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
