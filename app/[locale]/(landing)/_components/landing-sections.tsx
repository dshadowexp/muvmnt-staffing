import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { TRUST_LOGOS } from "@/lib/constants";
import {
  MessageCircle,
  ArrowRight,
  SparklesIcon,
  UserCheckIcon,
  ShieldCheck,
  Heart,
  Users,
  UsersRound,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { PipelineDiagram } from "./pipeline-diagram";
import { ctaPrimary, ctaOutline, ctaOutlineDark } from "../_lib/cta-classes";

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
  Heart,
  ShieldCheck,
  UsersRound,
  MessageCircle,
};

type HeroStat = { value: string; label: string };
type HowStep = { num: string; title: string; description: string };
type WhyPoint = { icon: string; title: string; description: string };
type Testimonial = { stars: number; text: string; name: string; role: string };
type Pipeline = {
  zoneLabel: string;
  journeyOverline: string;
  journeySubtitle: string;
  clientTrack: string[];
  proTrack: string[];
  clientSub: string;
  proSub: string;
};
type ScreeningStat = { value: string; label: string };

/* ──────────────────────────────────────────
   HeroSection
────────────────────────────────────────── */
export async function HeroSection() {
  const t = await getTranslations("landing.hero");
  const stats = t.raw("stats") as HeroStat[];

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-background px-6 py-20 pt-[120px] lg:px-12 lg:pb-20">
      {/* Lines grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.06)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Soft teal bloom — top-right atmospheric glow, sits above grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_85%_10%,oklch(0.527_0.154_150.069/0.07),transparent_60%),radial-gradient(ellipse_40%_50%_at_5%_90%,oklch(0.527_0.154_150.069/0.04),transparent_60%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <div className="flex w-full flex-col items-center">
            <div className="mb-7 inline-flex animate-fade-up items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-primary">
              <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" />
              {t("badge")}
            </div>

            <h1 className="mb-6 animate-fade-up-1 font-[var(--font-display)] text-[clamp(2.8rem,5vw,4.2rem)] font-extrabold leading-[1.05] tracking-tighter text-foreground">
              {t("titleLead")}
              <br />
              <span className="text-primary">{t("titleAccent")}</span>
              <br />
              <span className="relative inline-block">
                {t("titleTail")}
                <span className="absolute inset-x-0 bottom-1 h-[3px] rounded-sm bg-primary" />
              </span>
            </h1>

            <p className="mb-10 max-w-2xl animate-fade-up-2 text-lg font-light leading-7 text-muted-foreground">
              {t("subtitle1")}
            </p>

            <div className="flex animate-fade-up-3 flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up/client" className={ctaPrimary}>{t("ctaRequest")}</Link>
              <Link href="/find-work" className={ctaOutline}>{t("ctaProfessional")}</Link>
            </div>
          </div>

          <div className="mt-12 grid w-full max-w-2xl animate-fade-up-4 grid-cols-3 overflow-hidden rounded-2xl border border-primary/15 bg-primary/5">
            {stats.map(({ value, label }, i) => {
              const suffix = value.match(/[<>%+h]+$/)?.[0] ?? "";
              return (
                <div
                  key={label}
                  className={`px-5 py-7 text-center ${
                    i < stats.length - 1
                      ? "border-r border-primary/10"
                      : ""
                  }`}
                >
                  <div className="font-[var(--font-display)] text-3xl font-extrabold leading-none text-foreground lg:text-4xl">
                    {value.replace(/[<>%+h]/g, "")}
                    <span className="text-primary">{suffix}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
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
        {/* <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/requests/new" className={ctaPrimary}>{t("ctaRequest")}</Link>
        </div> */}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   WhyUsSection
────────────────────────────────────────── */
export async function WhyUsSection() {
  const t = await getTranslations("landing.why");
  const tHow = await getTranslations("landing.how");
  const points = t.raw("points") as WhyPoint[];
  const pipeline = t.raw("pipeline") as Pipeline;

  return (
    <section
      id="why"
      className="relative overflow-hidden bg-background px-6 py-24 lg:px-12 lg:py-32"
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

          {/* Right: journey pipeline diagram */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-background to-primary/12 p-6 ring-1 ring-primary/10 dark:from-primary/10 dark:via-card dark:to-primary/15 sm:p-8 lg:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,oklch(0.527_0.154_150.069/0.12),transparent_60%)]"
            />
            <div className="relative">
              <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[2px] text-primary/60">
                {pipeline.journeyOverline}
              </p>
              <p className="mb-6 text-sm font-light text-muted-foreground">
                {pipeline.journeySubtitle}
              </p>
              <PipelineDiagram
                zoneLabel={pipeline.zoneLabel}
                clientTrack={pipeline.clientTrack}
                proTrack={pipeline.proTrack}
                clientSub={pipeline.clientSub}
                proSub={pipeline.proSub}
              />
            </div>
          </div>
        </div>

        {/* <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link href="/find-staff" className={ctaPrimary}>{tHow("ctaRequest")}</Link>
          <Link href="/find-work" className={ctaOutline}>{tHow("ctaJoin")}</Link>
        </div> */}
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
    <section className="relative overflow-hidden bg-muted/30 px-6 py-24 lg:px-12 lg:py-32">
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

        {/* <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/requests/new" className={ctaPrimary}>{t("ctaGetStarted")}</Link>
        </div> */}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   AudienceSplitSection
   Two-track CTA after testimonials — professionals vs facilities.
────────────────────────────────────────── */
export async function AudienceSplitSection() {
  const t = await getTranslations("landing.audienceSplit");

  return (
    <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 py-20 lg:px-12 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_50%_0%,rgba(13,148,136,0.12)_0%,transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="flex flex-col justify-center px-0 py-12 md:py-14 md:pr-10 lg:pr-16">
            <h2 className="font-[var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-[1.65rem]">
              {t("worker.title")}
            </h2>
            <p className="mt-4 max-w-md text-[0.95rem] font-light leading-relaxed text-white/70">
              {t("worker.body")}
            </p>
            <div className="mt-8">
              <Link href="/sign-up/worker" className={ctaOutlineDark}>
                {t("worker.cta")}
                <ArrowRight className="size-4 opacity-80" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center px-0 py-12 md:py-14 md:pl-10 lg:pl-16">
            <h2 className="font-[var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-[1.65rem]">
              {t("facility.title")}
            </h2>
            <p className="mt-4 max-w-md text-[0.95rem] font-light leading-relaxed text-white/70">
              {t("facility.body")}
            </p>
            <div className="mt-8">
              <Link href="/sign-up/client" className={ctaOutlineDark}>
                {t("facility.cta")}
                <ArrowRight className="size-4 opacity-80" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   BridgeSection
   Sits between WhyUsSection and ScreeningSection.
   Pivots the narrative from "fill shifts fast" →
   "build your permanent team".
────────────────────────────────────────── */

type BridgeCard = { icon: string; eyebrow: string; title: string; body: string };

const BRIDGE_ICONS: Record<string, React.ElementType> = {
  sparkles: SparklesIcon,
  "user-check": UserRoundCheck,
};

export async function BridgeSection() {
  const t = await getTranslations("landing.bridge");
  const cards = t.raw("cards") as BridgeCard[];
  const journey = t.raw("journey") as string[];

  return (
    <section className="relative overflow-hidden bg-primary/[0.04] px-6 py-24 lg:px-12 lg:py-32">
      {/* Soft left-side bloom */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_5%_55%,oklch(0.527_0.154_150.069/0.07),transparent_65%)]" />
      {/* Hairlines for section rhythm */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-7xl">

        {/* ── Header ── */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary opacity-70" />
            {t("overline")}
          </div>
          <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
            {t("titleLead")}
            <br />
            <span className="text-primary">{t("titleAccent")}</span>
          </h2>
          <p className="mt-5 text-base font-light leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* ── Feature cards ── */}
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-7">
          {cards.map((card, i) => {
            const Icon = BRIDGE_ICONS[card.icon] ?? SparklesIcon;
            return (
              <div
                key={i}
                className="group/bc relative overflow-hidden rounded-2xl border border-border bg-background p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_24px_-8px_rgba(13,148,136,0.12)] lg:p-10"
              >
                {/* Subtle inner glow on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_left,rgba(13,148,136,0.10),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover/bc:opacity-100"
                />

                {/* Icon */}
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-transform duration-300 group-hover/bc:scale-105">
                  <Icon className="size-5 text-primary" />
                </div>

                {/* Eyebrow */}
                <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[2px] text-primary/70">
                  {card.eyebrow}
                </p>

                {/* Title */}
                <h3 className="mb-3 font-[var(--font-display)] text-xl font-bold leading-snug text-foreground">
                  {card.title}
                </h3>

                {/* Body */}
                <p className="text-sm font-light leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── CTAs ── */}
        <div className="mt-14 flex flex-col items-center gap-3">
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up/client" className={ctaPrimary}>
              {t("cta")}
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/screening" className={ctaOutline}>{t("ctaExplore")}</Link>
          </div>
          <Link
            href="/find-staff"
            className="text-[0.82rem] font-medium text-muted-foreground/60 underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
          >
            {t("ctaSub")}
          </Link>
        </div>

      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   ScreeningSection
────────────────────────────────────────── */

interface ScreeningDiagramProps {
  painLabels: [string, string, string];
  outputLabel: string;
}

function ScreeningDiagram({ painLabels, outputLabel }: ScreeningDiagramProps) {
  const teal = "rgba(13,148,136,";
  const red = "rgba(239,68,68,";

  // Pain point nodes funnelling into ReadyKare AI → Ranked Shortlist
  // Layout: [pain left] → [hub center] → [output right]

  const painCx = 55;
  const hubCx = 220;
  const hubCy = 130;
  const hubR = 42;
  const outCx = 390;
  const outCy = 130;
  const outR = 30;

  const painNodes = [
    {
      cy: 50,
      label: painLabels[0],
      // Clock
      d: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2",
    },
    {
      cy: 130,
      label: painLabels[1],
      // XCircle
      d: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M15 9l-6 6 M9 9l6 6",
    },
    {
      cy: 210,
      label: painLabels[2],
      // ShieldAlert
      d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v4 M12 16h.01",
    },
  ];

  // Scale a 24×24 Lucide icon to `size`px, centred at (cx, cy)
  function ix(cx: number, cy: number, size = 11) {
    const s = size / 24;
    return `translate(${cx - size / 2},${cy - size / 2}) scale(${s})`;
  }

  return (
    <svg
      viewBox="0 0 440 265"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-sm mx-auto lg:max-w-md"
      aria-hidden
    >
      {/* ── Bezier connectors: each pain node → hub left edge ── */}
      {painNodes.map((n) => (
        <path
          key={`conn-${n.cy}`}
          d={
            n.cy === hubCy
              ? `M ${painCx + 22} ${n.cy} L ${hubCx - hubR - 2} ${hubCy}`
              : `M ${painCx + 22} ${n.cy} C ${136} ${n.cy} ${136} ${hubCy} ${hubCx - hubR - 2} ${hubCy}`
          }
          stroke={`${red}0.28)`}
          strokeWidth="1.25"
          strokeDasharray="4 3"
        />
      ))}

      {/* Arrow tip at hub entry */}
      <path
        d={`M ${hubCx - hubR - 9} ${hubCy - 4} L ${hubCx - hubR - 2} ${hubCy} L ${hubCx - hubR - 9} ${hubCy + 4}`}
        stroke={`${red}0.45)`}
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Pain nodes (left column) ── */}
      {painNodes.map((n) => (
        <g key={n.label}>
          <circle
            cx={painCx} cy={n.cy} r={22}
            fill={`${red}0.10)`}
            stroke={`${red}0.32)`}
            strokeWidth="1.5"
          />
          <g
            transform={ix(painCx, n.cy)}
            stroke="rgba(239,68,68,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {n.d.split(" M ").map((seg, i) => (
              <path key={i} d={i === 0 ? seg : `M ${seg}`} />
            ))}
          </g>
          <text
            x={painCx} y={n.cy + 35}
            fill="rgba(255,255,255,0.38)"
            fontSize="8.5"
            textAnchor="middle"
            fontFamily="system-ui"
          >
            {n.label}
          </text>
        </g>
      ))}

      {/* ── Hub: ReadyKare AI ── */}
      {/* outer glow ring */}
      <circle cx={hubCx} cy={hubCy} r={hubR + 11}
        fill="none" stroke={`${teal}0.10)`} strokeWidth="16" />
      {/* main circle */}
      <circle cx={hubCx} cy={hubCy} r={hubR}
        fill={`${teal}0.17)`} stroke={`${teal}0.48)`} strokeWidth="1.5" />
      <text x={hubCx} y={hubCy - 5}
        fill="#5eead4" fontSize="10.5" fontWeight="700"
        textAnchor="middle" fontFamily="system-ui">ReadyKare</text>
      <text x={hubCx} y={hubCy + 10}
        fill="#5eead4" fontSize="10.5" fontWeight="700"
        textAnchor="middle" fontFamily="system-ui">AI</text>

      {/* ── Connector: hub right edge → output ── */}
      <line
        x1={hubCx + hubR + 2} y1={hubCy}
        x2={outCx - outR - 5} y2={outCy}
        stroke={`${teal}0.42)`}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* Arrow tip at output entry */}
      <path
        d={`M ${outCx - outR - 11} ${outCy - 4} L ${outCx - outR - 4} ${outCy} L ${outCx - outR - 11} ${outCy + 4}`}
        stroke={`${teal}0.65)`}
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Output: Ranked Shortlist ── */}
      {/* glow ring */}
      <circle cx={outCx} cy={outCy} r={outR + 8}
        fill="none" stroke={`${teal}0.10)`} strokeWidth="12" />
      <circle cx={outCx} cy={outCy} r={outR}
        fill={`${teal}0.20)`} stroke={`${teal}0.52)`} strokeWidth="1.5" />
      {/* CheckCircle icon */}
      <g
        transform={ix(outCx, outCy, 13)}
        stroke="#5eead4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </g>
      <text x={outCx} y={outCy + 47}
        fill="rgba(94,234,212,0.65)"
        fontSize="8.5" textAnchor="middle" fontFamily="system-ui">{outputLabel}</text>
    </svg>
  );
}

type ScreeningDiagramData = { painLabels: [string, string, string]; outputLabel: string };

export async function ScreeningSection() {
  const t = await getTranslations("landing.screening");
  const stats = t.raw("stats") as ScreeningStat[];
  const diagram = t.raw("diagram") as ScreeningDiagramData;

  return (
    <section className="relative overflow-hidden bg-background px-6 py-24 lg:px-12 lg:py-32">
      {/* Soft right-side bloom — mirrors Bridge section's left bloom */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_95%_50%,oklch(0.527_0.154_150.069/0.07),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">

          {/* ── Left: node diagram ── */}
          <div className="flex flex-col items-start justify-center">
            <Badge
              variant="secondary"
              className="mb-5 h-7 rounded-full border border-primary/20 bg-primary/10 px-3 text-[0.68rem] font-semibold tracking-[2.5px] text-primary"
            >
              {t("badge")}
            </Badge>
            <div className="relative w-full max-w-md rounded-3xl border border-primary/15 bg-primary/5 p-8 lg:p-10">
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,oklch(0.527_0.154_150.069/0.06),transparent_70%)]" />
              <ScreeningDiagram
                painLabels={diagram.painLabels}
                outputLabel={diagram.outputLabel}
              />
            </div>
          </div>

          {/* ── Right: copy ── */}
          <div>
            <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
              {t("titleLead")}
              <br />
              <span className="text-primary">{t("titleAccent")}</span>
            </h2>

            <p className="mt-5 max-w-md text-base font-light leading-7 text-muted-foreground">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/screening" className={ctaPrimary}>
                {t("ctaLearnMore")}
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/find-staff" className={ctaOutline}>{t("ctaStartHiring")}</Link>
            </div>

            {/* Mini stats row */}
            <div className="mt-10 flex items-center gap-8 border-t border-border pt-8">
              {stats.map(s => (
                <div key={s.label}>
                  <div className="font-[var(--font-display)] text-xl font-extrabold text-foreground">
                    {s.value}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
