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
import { Link } from "@/i18n/navigation";
import { LandingAuthCtas } from "../_components/landing-auth-ctas";
import { ctaOutlineSm } from "../_lib/cta-classes";
import { HowItWorks } from "./_how-it-works";
import { FindWorkHeroDiagram } from "./_hero-diagram";

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
      <section className="relative flex min-h-screen items-center overflow-hidden bg-background px-6 py-20 pt-[120px] lg:px-12 lg:pb-20">
        {/* Teal grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.06)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Atmospheric teal bloom */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_85%_10%,oklch(0.527_0.154_150.069/0.07),transparent_60%),radial-gradient(ellipse_40%_50%_at_5%_90%,oklch(0.527_0.154_150.069/0.04),transparent_60%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="flex flex-col items-center text-center">

            {/* Breadcrumb */}
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

            {/* Badge */}
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-primary">
              <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" />
              {t("badge")}
            </div>

            {/* Heading */}
            <h1 className="mb-6 max-w-3xl font-[var(--font-display)] text-[clamp(2.8rem,5vw,4.2rem)] font-extrabold leading-[1.05] tracking-tighter text-foreground">
              {t("titleLead")}{" "}
              <span className="text-primary">{t("titleAccent")}</span>{" "}
              <span className="relative inline-block">
                {t("titleTail")}
                <span className="absolute inset-x-0 bottom-1 h-[3px] rounded-sm bg-primary" />
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mb-10 max-w-2xl text-lg font-light leading-7 text-muted-foreground">
              {t("subtitle")}
            </p>

            {/* CTAs */}
            <LandingAuthCtas
              signUpHref="/sign-up/staff"
              ctaCreateLabel={t("ctaCreate")}
              ctaSignInLabel={t("ctaSignIn")}
              variant="onLight"
              className="justify-center"
            />

            {/* Diagram */}
            <div className="mt-16 w-full">
              <FindWorkHeroDiagram />
            </div>

          </div>
        </div>
      </section>

      <HowItWorks />

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

      <section className="bg-background px-6 py-16 lg:px-12 lg:py-20">
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
            <Link href="/faq" className={ctaOutlineSm}>
              {t("seeFaq")}
              <ArrowRight className="size-4" />
            </Link>
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
