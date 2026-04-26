import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Sparkles,
  ClipboardList,
  Wand2,
  ListChecks,
  CalendarCheck,
  Timer,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { ctaPrimary, ctaOutlineDark } from "../_lib/cta-classes";

/* ── Icon registry ────────────────────────────────────────────────────────── */

const SCREEN_ICONS: Record<string, LucideIcon> = {
  ClipboardList,
  Wand2,
  ListChecks,
  CalendarCheck,
  Timer,
  Smartphone,
  CheckCircle2,
};

/* ── Types ────────────────────────────────────────────────────────────────── */

type PainItem = {
  num: string;
  stat: string;
  statLabel: string;
  title: string;
  body: string;
};

type HowStep = {
  icon: string;
  title: string;
  body: string;
};

type CandidatePerk = {
  icon: string;
  title: string;
  body: string;
};

type StatItem = {
  value: string;
  label: string;
};

/* ── Metadata ─────────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "screening.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/screening" },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

/* ── Shared ──────────────────────────────────────────────────────────────── */

const SectionOverline = ({ children }: { children: React.ReactNode }) => (
  <Badge
    variant="secondary"
    className="mb-4 h-7 rounded-full border border-primary/15 bg-primary/10 px-3 text-[0.68rem] font-semibold uppercase tracking-[2.5px] text-primary dark:bg-primary/15"
  >
    {children}
  </Badge>
);

/* ── Hero ─────────────────────────────────────────────────────────────────── */

async function Hero() {
  const t = await getTranslations("screening.hero");

  return (
    <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 py-24 text-center lg:px-12 lg:py-36">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(13,148,136,0.2)_0%,transparent_60%)]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-[var(--teal-mid)]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--teal-mid)]" />
          {t("badge")}
        </div>

        <h1 className="font-[var(--font-display)] text-[clamp(2.6rem,5vw,3.8rem)] font-extrabold leading-[1.06] tracking-tighter text-white">
          {t("titleLead")}
          <br />
          <span className="text-[var(--teal-mid)]">{t("titleAccent")}</span>{" "}
          {t("titleTail")}
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-7 text-white/55">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/find-staff" className={ctaPrimary}>{t("ctaGetStarted")}</Link>
          <Link href="#how-it-works" className={ctaOutlineDark}>{t("ctaHowItWorks")}</Link>
        </div>
      </div>
    </section>
  );
}

/* ── Pain points ──────────────────────────────────────────────────────────── */

async function PainSection() {
  const t = await getTranslations("screening.pain");
  const items = t.raw("items") as PainItem[];

  return (
    <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 py-24 lg:px-12 lg:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(13,148,136,0.4)] to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionOverline>{t("overline")}</SectionOverline>
            <h2 className="mt-2 font-[var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight text-white">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-xs text-sm font-light leading-relaxed text-white/40 sm:text-right">
            {t("tagline")}
          </p>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {items.map(({ num, stat, statLabel, title, body }) => (
            <div
              key={num}
              className="group relative grid grid-cols-1 gap-4 py-10 transition-colors duration-300 hover:bg-white/[0.025] lg:grid-cols-[5rem_1fr_auto] lg:items-center lg:gap-12 lg:px-6"
            >
              <div className="select-none font-[var(--font-display)] text-[3.5rem] font-black leading-none tracking-tighter text-white/[0.07] transition-colors duration-300 group-hover:text-white/[0.12] lg:text-[4rem]">
                {num}
              </div>

              <div>
                <h3 className="font-[var(--font-display)] text-[clamp(1.15rem,2vw,1.35rem)] font-bold leading-snug text-white/90">
                  {title}
                </h3>
                <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-white/40">
                  {body}
                </p>
              </div>

              <div className="lg:text-right">
                <div className="inline-flex flex-col items-start rounded-2xl border border-destructive/20 bg-destructive/10 px-5 py-3 lg:items-end">
                  <span className="font-[var(--font-display)] text-2xl font-extrabold leading-none tracking-tight text-destructive">
                    {stat}
                  </span>
                  <span className="mt-1 text-[0.68rem] font-medium uppercase tracking-widest text-destructive/60">
                    {statLabel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────────────────── */

async function HowItWorks() {
  const t = await getTranslations("screening.how");
  const steps = t.raw("steps") as HowStep[];

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-background px-6 py-24 lg:px-12 lg:py-28"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,oklch(0.527_0.154_150.069/0.07),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <SectionOverline>{t("overline")}</SectionOverline>
          <h2 className="font-[var(--font-display)] text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
            {t("titleLead")}
            <br />
            <span className="text-primary">{t("titleAccent")}</span>
          </h2>
          <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="relative mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-8">
          {steps.map(({ icon, title, body }, i) => {
            const Icon = SCREEN_ICONS[icon] ?? ClipboardList;
            return (
              <div key={title} className="relative">
                {i < steps.length - 1 && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-full top-11 hidden h-px w-8 bg-[linear-gradient(to_right,theme(colors.primary)_50%,transparent_50%)] bg-[length:8px_1px] opacity-40 sm:block"
                  />
                )}
                <Card className="group/step h-full rounded-2xl border-0 ring-1 ring-border shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:ring-primary/35 hover:shadow-[0_16px_40px_-12px_rgba(13,148,136,0.18)]">
                  <CardContent className="flex h-full flex-col p-7 lg:p-8">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-all duration-300 group-hover/step:bg-primary group-hover/step:text-primary-foreground group-hover/step:shadow-[0_6px_16px_-4px_rgba(13,148,136,0.4)]">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mb-2 font-[var(--font-display)] text-base font-bold text-foreground">
                      {title}
                    </h3>
                    <p className="text-sm font-light leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Candidate experience ─────────────────────────────────────────────────── */

async function CandidateExperience() {
  const t = await getTranslations("screening.candidate");
  const perks = t.raw("perks") as CandidatePerk[];

  return (
    <section className="relative bg-secondary/40 px-6 py-24 dark:bg-muted/40 lg:px-12 lg:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionOverline>{t("overline")}</SectionOverline>
            <h2 className="font-[var(--font-display)] text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
              {t("titleLead")}
              <br />
              <span className="text-primary">{t("titleAccent")}</span>
            </h2>
            <p className="mt-5 max-w-md text-base font-light leading-relaxed text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          <div className="relative rounded-3xl bg-gradient-to-br from-primary/8 via-background to-primary/12 p-5 ring-1 ring-primary/10 dark:from-primary/10 dark:via-card dark:to-primary/15 sm:p-6 lg:p-7">
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,oklch(0.527_0.154_150.069/0.1),transparent_60%)]" />
            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
              {perks.map(({ icon, title, body }) => {
                const Icon = SCREEN_ICONS[icon] ?? CalendarCheck;
                return (
                  <Card
                    key={title}
                    className="group/perk rounded-2xl border-0 ring-1 ring-border shadow-[0_2px_8px_-2px_rgba(16,24,40,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/35 hover:shadow-[0_12px_28px_-8px_rgba(13,148,136,0.2)]"
                  >
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors duration-300 group-hover/perk:bg-primary group-hover/perk:text-primary-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <div className="font-[var(--font-display)] text-sm font-bold text-foreground">
                          {title}
                        </div>
                        <div className="mt-1 text-xs font-light leading-relaxed text-muted-foreground">
                          {body}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats ────────────────────────────────────────────────────────────────── */

async function StatsSection() {
  const t = await getTranslations("screening.stats");
  const items = t.raw("items") as StatItem[];

  return (
    <section className="relative overflow-hidden bg-background px-6 py-20 lg:px-12">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-[var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-tight text-primary">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-light text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <Separator className="mt-16" />
      </div>
    </section>
  );
}

/* ── CTA ──────────────────────────────────────────────────────────────────── */

async function CtaSection() {
  const t = await getTranslations("screening.cta");

  return (
    <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 py-24 text-center lg:px-12 lg:py-28">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(13,148,136,0.18)_0%,transparent_60%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(13,148,136,0.3)] to-transparent" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)]">
            <Sparkles className="size-6 text-[var(--teal-mid)]" />
          </div>
        </div>

        <h2 className="font-[var(--font-display)] text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-white">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-white/50">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/find-staff" className={ctaPrimary}>
            {t("ctaGetStarted")}
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/#how" className={ctaOutlineDark}>{t("ctaHowItWorks")}</Link>
        </div>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function ScreeningPage() {
  return (
    <>
      <Hero />
      <PainSection />
      <HowItWorks />
      <CandidateExperience />
      <StatsSection />
      <CtaSection />
    </>
  );
}
