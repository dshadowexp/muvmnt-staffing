import Link from "next/link";
import {
  HERO_STATS, SERVICES, TRUST_LOGOS, HOW_STEPS,
  WHY_POINTS, TESTIMONIALS,
} from "@/lib/constants";
import {
  Zap, BadgeCheck, MapPin, MessageCircle,
  Trophy, ClipboardCheck, Timer,
  Hospital, House,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const WHY_ICONS: Record<string, LucideIcon> = {
  Zap, BadgeCheck, MapPin, MessageCircle,
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  Hospital, House,
};

const STAT_CARDS: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: Trophy, title: "500+ Healthcare Facilities", sub: "Trust Muvmnt across Ontario" },
  { icon: ClipboardCheck, title: "98% Fill Rate", sub: "Across all shift categories" },
  { icon: Timer, title: "< 2hr Response Time", sub: "For emergency placements" },
];

/* ──────────────────────────────────────────
   HeroSection
────────────────────────────────────────── */
export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[var(--charcoal)] px-6 py-20 pt-[120px] lg:px-12 lg:pb-20">
      {/* Background gradient layer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(13,148,136,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(20,184,166,0.10)_0%,transparent_50%),linear-gradient(135deg,#0f1a18_0%,#0d2420_50%,#0a1f1c_100%)]" />

      {/* Grid pattern layer */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="mb-7 inline-flex animate-fade-up items-center gap-2 rounded-full border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-[var(--teal-mid)]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--teal-mid)]" />
              Canada&apos;s Healthcare Staffing Partner
            </div>

            <h1 className="mb-6 animate-fade-up-1 font-[var(--font-display)] text-[clamp(2.8rem,5vw,4.2rem)] font-extrabold leading-[1.05] tracking-tighter text-white">
              The Right{" "}
              <span className="text-[var(--teal-mid)]">Care</span>
              <br />
              Staff.{" "}
              <span className="relative inline-block">
                When You
                <span className="absolute inset-x-0 bottom-1 h-[3px] rounded-sm bg-[var(--teal-mid)]" />
              </span>
              <br />
              Need Them.
            </h1>

            <p className="mb-10 max-w-lg animate-fade-up-2 text-lg font-light leading-7 text-white/60">
              Muvmnt connects Canadian healthcare facilities with pre-screened,
              credentialed professionals — fast. From emergency relief shifts to
              ongoing home care, we keep care moving.
            </p>

            <div className="flex animate-fade-up-3 flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/find-talent">Find Talent Now →</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Link href="/find-work">I&apos;m a Professional</Link>
              </Button>
            </div>
          </div>

          {/* Right: stats */}
          <div className="grid animate-fade-up-4 grid-cols-3 overflow-hidden rounded-2xl border border-[rgba(13,148,136,0.2)] bg-[rgba(13,148,136,0.08)]">
            {HERO_STATS.map(({ value, label }, i) => (
              <div
                key={label}
                className={`bg-white/[0.03] px-5 py-7 text-center ${
                  i < HERO_STATS.length - 1
                    ? "border-r border-[rgba(13,148,136,0.1)]"
                    : ""
                }`}
              >
                <div className="font-[var(--font-display)] text-3xl font-extrabold leading-none text-white lg:text-4xl">
                  {value.replace(/[<>%+h]/g, "")}
                  <span className="text-[var(--teal-mid)]">
                    {value.match(/[<>%+h]+$/)?.[0] ?? ""}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-white/45">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   TrustBar
────────────────────────────────────────── */
export function TrustBar() {
  const logos = [...TRUST_LOGOS, ...TRUST_LOGOS];

  return (
    <div className="relative overflow-hidden border-b border-border bg-muted py-6">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-muted to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-muted to-transparent" />

      <div className="mb-3 text-center text-[0.68rem] font-semibold uppercase tracking-[2px] text-muted-foreground/60">
        Trusted by leading healthcare organizations
      </div>

      {/* Scrolling marquee */}
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
   ServicesSection
────────────────────────────────────────── */
export function ServicesSection() {
  return (
    <section id="services" className="bg-background px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header row */}
        <div className="mb-16 flex flex-wrap items-end justify-between gap-10">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-primary">
              Our Services
            </p>
            <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
              Staffing solutions built
              <br />
              for healthcare.
            </h2>
            <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-muted-foreground">
              Whether you need a nurse on the floor tonight or a reliable home
              care team, Muvmnt has you covered with qualified, compassionate
              professionals.
            </p>
          </div>
          <Button asChild>
            <Link href="/find-talent">Request Staff →</Link>
          </Button>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SERVICES.map((s) => {
            const Icon = SERVICE_ICONS[s.icon];
            return (
            <Card
              key={s.title}
              className="group cursor-default border border-border bg-card p-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[0_20px_48px_rgba(13,148,136,0.1)]"
            >
              <CardContent className="p-10">
                <div className="mb-6 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-primary/10">
                  {Icon && <Icon className="size-6 text-primary" />}
                </div>
                <h3 className="mb-3 font-[var(--font-display)] text-xl font-bold tracking-tight text-card-foreground">
                  {s.title}
                </h3>
                <p className="text-[0.92rem] font-light leading-7 text-muted-foreground">
                  {s.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   HowItWorksSection
────────────────────────────────────────── */
export function HowItWorksSection() {
  return (
    <section id="how" className="bg-secondary px-6 py-20 dark:bg-card lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-primary">
          How It Works
        </p>
        <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-secondary-foreground">
          Simple. Fast.
          <br />
          Reliable.
        </h2>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-muted-foreground">
          From request to placement in hours, not days. Our process is built for
          the pace of healthcare.
        </p>

        {/* Steps grid */}
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map((s, i) => (
            <div
              key={s.num}
              className={`bg-background/50 p-7 transition-colors duration-300 hover:bg-primary/10 lg:p-10 ${
                i < HOW_STEPS.length - 1
                  ? "border-b border-border sm:border-b-0 sm:border-r"
                  : ""
              }`}
            >
              <div className="mb-5 font-[var(--font-display)] text-5xl font-extrabold leading-none text-primary/20">
                {s.num}
              </div>
              <h3 className="mb-3 font-[var(--font-display)] text-lg font-bold text-foreground">
                {s.title}
              </h3>
              <p className="text-sm font-light leading-7 text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   WhyUsSection
────────────────────────────────────────── */
export function WhyUsSection() {
  return (
    <section id="why" className="bg-muted px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
          {/* Left — copy */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-primary">
              Why Muvmnt
            </p>
            <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
              We move at the
              <br />
              speed of care.
            </h2>
            <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-muted-foreground">
              Healthcare can&apos;t wait. Neither can we. Muvmnt was built from
              the ground up to solve the unique pressures Canadian healthcare
              organizations face every day.
            </p>

            <div className="mt-10 flex flex-col gap-7">
              {WHY_POINTS.map((p) => {
                const Icon = WHY_ICONS[p.icon];
                return (
                <div key={p.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary text-base">
                    {Icon && <Icon className="size-[18px] text-primary-foreground" />}
                  </div>
                  <div>
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

          {/* Right — visual stat cards */}
          <div className="relative overflow-hidden rounded-[20px] bg-[var(--charcoal)] p-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(13,148,136,0.2)_0%,transparent_60%)]" />
            {STAT_CARDS.map((c) => (
              <div
                key={c.title}
                className="relative z-10 mb-4 flex items-center gap-4 rounded-xl border border-[rgba(13,148,136,0.15)] bg-white/[0.06] p-6 last:mb-0"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(13,148,136,0.2)]">
                  <c.icon className="size-5 text-[var(--teal-mid)]" />
                </div>
                <div>
                  <div className="font-[var(--font-display)] text-[0.95rem] font-bold text-white">
                    {c.title}
                  </div>
                  <div className="text-xs font-light text-white/45">
                    {c.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   TestimonialsSection
────────────────────────────────────────── */
export function TestimonialsSection() {
  return (
    <section className="bg-background px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-primary">
          Testimonials
        </p>
        <h2 className="font-[var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] tracking-tight text-foreground">
          What our clients say.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card
              key={t.name}
              className="border border-border bg-card p-0 transition-all duration-300 hover:border-primary hover:shadow-[0_12px_32px_rgba(13,148,136,0.08)]"
            >
              <CardContent className="p-8">
                {/* Stars */}
                <div className="mb-5 text-sm tracking-[2px] text-primary">
                  {"★".repeat(t.stars)}
                </div>
                <p className="mb-6 text-[0.92rem] font-light italic leading-7 text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </p>

                <Separator className="mb-6" />

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-[var(--font-display)] text-sm font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-card-foreground">
                      {t.name}
                    </div>
                    <div className="text-xs font-light text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
