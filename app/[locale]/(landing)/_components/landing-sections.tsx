import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TRUST_LOGOS } from "@/lib/constants";
import {
  Zap,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Trophy,
  ClipboardCheck,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* Shared overline pill used in light-mode content sections */
const SectionOverline = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <Badge
    variant="secondary"
    className={cn(
      "mb-4 h-7 rounded-full border border-primary/15 bg-primary/10 px-3 text-[0.68rem] font-semibold uppercase tracking-[2.5px] text-primary dark:bg-primary/15",
      className
    )}
  >
    {children}
  </Badge>
);

const WHY_ICONS: Record<string, LucideIcon> = {
  Zap,
  BadgeCheck,
  MapPin,
  MessageCircle,
};

const STAT_CARD_ICONS: LucideIcon[] = [Trophy, ClipboardCheck, Timer];

type HeroStat = { value: string; label: string };
type HowStep = { num: string; title: string; description: string };
type WhyPoint = { icon: string; title: string; description: string };
type StatCard = { title: string; subtitle: string };
type Testimonial = { stars: number; text: string; name: string; role: string };

/* ──────────────────────────────────────────
   HeroSection
────────────────────────────────────────── */
export async function HeroSection() {
  const t = await getTranslations("landing.hero");
  const stats = t.raw("stats") as HeroStat[];

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[var(--charcoal)] px-6 py-20 pt-[120px] lg:px-12 lg:pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(13,148,136,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(20,184,166,0.10)_0%,transparent_50%),linear-gradient(135deg,#0f1a18_0%,#0d2420_50%,#0a1f1c_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="mb-7 inline-flex animate-fade-up items-center gap-2 rounded-full border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-[var(--teal-mid)]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--teal-mid)]" />
              {t("badge")}
            </div>

            <h1 className="mb-6 animate-fade-up-1 font-[var(--font-display)] text-[clamp(2.8rem,5vw,4.2rem)] font-extrabold leading-[1.05] tracking-tighter text-white">
              {t("titleLead")}
              <br />
              <span className="text-[var(--teal-mid)]">{t("titleAccent")}</span>
              <br />
              <span className="relative inline-block">
                {t("titleTail")}
                <span className="absolute inset-x-0 bottom-1 h-[3px] rounded-sm bg-[var(--teal-mid)]" />
              </span>
            </h1>

            <p className="mb-10 max-w-lg animate-fade-up-2 text-lg font-light leading-7 text-white/60">
              {t("subtitle")}
            </p>

            <div className="flex animate-fade-up-3 flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/find-staff">{t("ctaRequest")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/find-work">{t("ctaProfessional")}</Link>
              </Button>
            </div>
          </div>

          <div className="grid animate-fade-up-4 grid-cols-3 overflow-hidden rounded-2xl border border-[rgba(13,148,136,0.2)] bg-[rgba(13,148,136,0.08)]">
            {stats.map(({ value, label }, i) => {
              const suffix = value.match(/[<>%+h]+$/)?.[0] ?? "";
              return (
                <div
                  key={label}
                  className={`bg-white/[0.03] px-5 py-7 text-center ${
                    i < stats.length - 1
                      ? "border-r border-[rgba(13,148,136,0.1)]"
                      : ""
                  }`}
                >
                  <div className="font-[var(--font-display)] text-3xl font-extrabold leading-none text-white lg:text-4xl">
                    {value.replace(/[<>%+h]/g, "")}
                    <span className="text-[var(--teal-mid)]">{suffix}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-white/45">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   TrustBar
────────────────────────────────────────── */
export async function TrustBar() {
  const t = await getTranslations("landing.trust");
  const logos = [...TRUST_LOGOS, ...TRUST_LOGOS];

  return (
    <div className="relative overflow-hidden border-b border-border bg-muted py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-muted to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-muted to-transparent" />

      <div className="mb-3 text-center text-[0.68rem] font-semibold uppercase tracking-[2px] text-muted-foreground/60">
        {t("label")}
      </div>

      <div className="flex animate-[marquee_30s_linear_infinite] items-center gap-12 whitespace-nowrap lg:gap-16">
        {logos.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="flex items-center gap-2 font-[var(--font-display)] text-base font-bold tracking-tight text-foreground/30 transition-colors hover:text-foreground/50 lg:text-lg"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/40" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   HowItWorksSection
────────────────────────────────────────── */
export async function HowItWorksSection() {
  const t = await getTranslations("landing.how");
  const steps = t.raw("steps") as HowStep[];

  return (
    <section
      id="how"
      className="relative overflow-hidden bg-background px-6 py-24 lg:px-12 lg:py-32 dark:bg-card"
    >
      {/* Soft primary-tinted glow from the top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,oklch(0.527_0.154_150.069/0.08),transparent_70%)]"
      />
      {/* Top hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Centered header */}
        <div className="mx-auto max-w-2xl text-center">
          <SectionOverline>{t("overline")}</SectionOverline>
          <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {/* Dashed connector between cards on desktop */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-full top-12 hidden h-px w-6 -translate-x-0 bg-[linear-gradient(to_right,theme(colors.primary)_50%,transparent_50%)] bg-[length:8px_1px] opacity-40 lg:block"
                />
              )}

              <Card className="group/step relative h-full rounded-2xl border-0 bg-card p-0 ring-1 ring-border shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:ring-primary/35 hover:shadow-[0_16px_40px_-12px_rgba(13,148,136,0.18)]">
                <CardContent className="flex h-full flex-col p-7 lg:p-8">
                  <div className="mb-6 flex items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-[var(--font-display)] text-[0.95rem] font-extrabold text-primary-foreground shadow-[0_6px_16px_-4px_rgba(13,148,136,0.4)] ring-4 ring-primary/10 transition-transform duration-300 group-hover/step:scale-105">
                      {s.num}
                    </div>
                  </div>
                  <h3 className="mb-2 font-[var(--font-display)] text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/find-staff">{t("ctaRequest")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/find-work">{t("ctaJoin")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   WhyUsSection
────────────────────────────────────────── */
export async function WhyUsSection() {
  const t = await getTranslations("landing.why");
  const points = t.raw("points") as WhyPoint[];
  const statCards = t.raw("statCards") as StatCard[];

  return (
    <section
      id="why"
      className="relative overflow-hidden bg-secondary/40 px-6 py-24 dark:bg-muted/40 lg:px-12 lg:py-32"
    >
      {/* Soft primary-tinted glow from the bottom — mirror of HowItWorks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_55%_60%_at_50%_100%,oklch(0.527_0.154_150.069/0.07),transparent_70%)]"
      />
      {/* Top hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* Left: heading + checklist */}
          <div>
            <SectionOverline>{t("overline")}</SectionOverline>
            <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
              {t("title")}
            </h2>
            <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-muted-foreground">
              {t("subtitle")}
            </p>

            <div className="mt-10 flex flex-col gap-2">
              {points.map((p) => {
                const Icon = WHY_ICONS[p.icon];
                return (
                  <div
                    key={p.title}
                    className="group/pt flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-primary/5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_16px_-4px_rgba(13,148,136,0.35)] ring-4 ring-primary/10 transition-transform duration-300 group-hover/pt:scale-105">
                      {Icon && <Icon className="size-[18px]" />}
                    </div>
                    <div className="pt-1">
                      <h4 className="mb-1 font-[var(--font-display)] text-base font-bold text-foreground">
                        {p.title}
                      </h4>
                      <p className="text-sm font-light leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: elegant light-mode stats panel */}
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/8 via-background to-primary/12 p-5 ring-1 ring-primary/10 backdrop-blur-sm dark:from-primary/10 dark:via-card dark:to-primary/15 sm:p-6 lg:p-7">
            {/* Soft decorative glow inside the panel */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,oklch(0.527_0.154_150.069/0.12),transparent_60%)]"
            />

            <div className="relative flex flex-col gap-4">
              {statCards.map((c, i) => {
                const Icon = STAT_CARD_ICONS[i] ?? Trophy;
                return (
                  <Card
                    key={c.title}
                    className="group/stat rounded-2xl border-0 bg-card p-0 ring-1 ring-border shadow-[0_2px_8px_-2px_rgba(16,24,40,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/35 hover:shadow-[0_12px_28px_-8px_rgba(13,148,136,0.2)]"
                  >
                    <CardContent className="flex items-center gap-5 p-5 lg:p-6">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors duration-300 group-hover/stat:bg-primary group-hover/stat:text-primary-foreground group-hover/stat:ring-primary/30">
                        <Icon className="size-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-[var(--font-display)] text-lg font-extrabold leading-tight tracking-tight text-foreground lg:text-xl">
                          {c.title}
                        </div>
                        <div className="mt-1 text-xs font-medium text-muted-foreground">
                          {c.subtitle}
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

/* ──────────────────────────────────────────
   TestimonialsSection
────────────────────────────────────────── */
export async function TestimonialsSection() {
  const t = await getTranslations("landing.testimonials");
  const items = t.raw("items") as Testimonial[];

  return (
    <section className="relative overflow-hidden bg-background px-6 py-24 lg:px-12 lg:py-32">
      {/* Matching top hairline for rhythm with the two sections above */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <SectionOverline>{t("overline")}</SectionOverline>
          <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
            {t("title")}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card
              key={it.name}
              className="rounded-2xl border-0 bg-card p-0 ring-1 ring-border shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:ring-primary/35 hover:shadow-[0_16px_40px_-12px_rgba(13,148,136,0.18)]"
            >
              <CardContent className="p-8">
                <div className="mb-5 text-sm tracking-[2px] text-primary">
                  {"★".repeat(it.stars)}
                </div>
                <p className="mb-6 text-[0.92rem] font-light italic leading-7 text-muted-foreground">
                  &ldquo;{it.text}&rdquo;
                </p>

                <Separator className="mb-6" />

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-[var(--font-display)] text-sm font-bold text-primary">
                    {it.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-card-foreground">
                      {it.name}
                    </div>
                    <div className="text-xs font-light text-muted-foreground">
                      {it.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/find-staff">{t("ctaRequest")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/find-work">{t("ctaFindWork")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
