import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Zap,
  CalendarClock,
  DollarSign,
  Headset,
  ClipboardList,
  BellRing,
  ShieldCheck,
  TrendingUp,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Find Work",
  description:
    "Join Muvmnt's network of healthcare professionals. Create a free account to get matched with opportunities across Canada.",
};

interface IconItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const PERKS: IconItem[] = [
  { icon: Zap, title: "Fast Placements", desc: "Get matched with shifts quickly — including same-day opportunities." },
  { icon: CalendarClock, title: "Flexible Scheduling", desc: "Pick the shifts that work for you — days, nights, weekends, or relief." },
  { icon: DollarSign, title: "Competitive Pay", desc: "We advocate for fair, competitive rates for every professional." },
  { icon: Headset, title: "Dedicated Support", desc: "A real person handles your file — no bots, no black holes." },
];

const BENEFITS: IconItem[] = [
  { icon: ClipboardList, title: "One profile. Endless opportunities.", desc: "Fill out your details once — we match you with shifts that fit your skills, availability, and preferred settings." },
  { icon: BellRing, title: "Real-time shift notifications.", desc: "Get notified the moment a matching opportunity becomes available in your area." },
  { icon: ShieldCheck, title: "Your data stays private.", desc: "We only share your profile with facilities when you're matched. Protected under PIPEDA." },
  { icon: TrendingUp, title: "Track your placements.", desc: "View your history, upcoming shifts, and earnings — all from your dashboard." },
];

const ROLES = [
  { abbr: "RN", full: "Registered Nurse" },
  { abbr: "RPN", full: "Registered Practical Nurse" },
  { abbr: "PSW", full: "Personal Support Worker" },
  { abbr: "DSW", full: "Developmental Support Worker" },
  { abbr: "Allied", full: "Allied Health" },
  { abbr: "Support", full: "Healthcare Support" },
];

const STEPS = [
  "Create your free account",
  "Tell us about your experience",
  "Get matched with opportunities",
  "Accept shifts and get paid",
];

export default function FindWorkPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 pb-20 pt-[72px] lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.15)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 text-xs font-light text-white/35">
            <Link href="/" className="text-white/40 no-underline transition-colors hover:text-white/60">
              Home
            </Link>
            <span>/</span>
            <span className="text-primary">Find Work</span>
          </div>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left: copy */}
            <div>
              <Badge className="mb-6 gap-1.5 border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] text-[var(--teal-mid)]">
                Professional Network
              </Badge>

              <h1 className="mb-5 font-[var(--font-display)] text-[clamp(2.2rem,4vw,3.2rem)] font-extrabold leading-[1.08] tracking-tight text-primary-foreground">
                Your next
                <br />
                <span className="text-primary">healthcare career</span>
                <br />
                move starts here.
              </h1>

              <p className="mb-9 max-w-[440px] text-base font-light leading-[1.7] text-white/60">
                We connect skilled healthcare professionals with the best
                facilities across Ontario. Create a free account — we&apos;ll
                handle the matching.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/sign-up">Create Free Account →</Link>
                </Button>
                <Link
                  href="/sign-in"
                  className="text-sm text-white/45 no-underline transition-colors hover:text-white/70"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>

            {/* Right: perks grid */}
            <div className="grid grid-cols-2 gap-4">
              {PERKS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl border border-[rgba(13,148,136,0.15)] bg-white/[0.04] px-[18px] py-5"
                >
                  <p.icon className="mb-2.5 size-6 text-[var(--teal-mid)]" />
                  <p className="mb-1.5 font-[var(--font-display)] text-[0.9rem] font-bold text-white">
                    {p.title}
                  </p>
                  <p className="text-[0.8rem] font-light leading-[1.55] text-white/45">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sign-up section */}
      <section className="bg-background px-6 py-[88px] lg:px-12 lg:pb-[108px]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left — benefits */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
                For Professionals
              </p>
              <h2 className="mb-4 font-[var(--font-display)] text-[clamp(1.7rem,2.8vw,2.3rem)] font-extrabold leading-[1.12] tracking-tight text-foreground">
                One account.
                <br />
                Your entire career.
              </h2>
              <p className="mb-10 max-w-[420px] text-[0.9rem] font-light leading-[1.75] text-muted-foreground">
                Muvmnt&apos;s professional portal keeps your credentials,
                availability, and placement history in one place — so
                opportunities find you faster.
              </p>

              <div className="flex flex-col gap-6">
                {BENEFITS.map((b) => (
                  <div key={b.title} className="flex items-start gap-4">
                    <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] border border-border bg-card shadow-sm">
                      <b.icon className="size-[18px] text-primary" />
                    </div>
                    <div>
                      <p className="mb-1 font-[var(--font-display)] text-[0.9rem] font-bold text-foreground">
                        {b.title}
                      </p>
                      <p className="text-[0.82rem] font-light leading-[1.6] text-muted-foreground">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — sign-up card */}
            <div className="top-[90px] lg:sticky">
              <Card className="overflow-hidden rounded-2xl p-0 shadow-lg">
                {/* Card header */}
                <div className="relative overflow-hidden bg-primary px-8 py-7">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_100%_100%,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                  <div className="relative z-10">
                    <Badge className="mb-3.5 gap-1.5 border border-primary-foreground/25 bg-primary-foreground/15 text-[0.72rem] text-primary-foreground">
                      ✦ Free to join
                    </Badge>
                    <h3 className="mb-2 font-[var(--font-display)] text-[1.4rem] font-extrabold leading-[1.15] tracking-tight text-primary-foreground">
                      Ready to get matched?
                    </h3>
                    <p className="text-[0.845rem] font-light leading-[1.6] text-primary-foreground/60">
                      Create your free account and tell us about your experience.
                      Our team does the rest.
                    </p>
                  </div>
                </div>

                {/* Card body */}
                <CardContent className="flex flex-col gap-4 px-8 py-7">
                  {/* Roles */}
                  <div>
                    <p className="mb-2.5 text-[0.72rem] font-semibold uppercase tracking-[1px] text-muted-foreground">
                      We place
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => (
                        <div
                          key={r.abbr}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-primary/5 px-3 py-[7px]"
                        >
                          <span className="font-[var(--font-display)] text-[0.78rem] font-extrabold text-primary">
                            {r.abbr}
                          </span>
                          <span className="text-[0.72rem] font-light text-muted-foreground">
                            {r.full}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Steps */}
                  <div className="flex flex-col gap-3">
                    {STEPS.map((step, i) => (
                      <div key={step} className="flex items-center gap-3">
                        <div
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full font-[var(--font-display)] text-[0.65rem] font-bold ${
                            i === 0
                              ? "border-[1.5px] border-primary bg-primary text-primary-foreground"
                              : "border-[1.5px] border-border bg-primary/5 text-primary"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <span
                          className={`text-[0.845rem] ${
                            i === 0
                              ? "font-semibold text-foreground"
                              : "font-light text-muted-foreground"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-border" />

                  {/* CTA */}
                  <Button size="lg" className="w-full" asChild>
                    <Link href="/sign-up">Create Free Account →</Link>
                  </Button>

                  <p className="text-center text-[0.8rem] font-light text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/sign-in"
                      className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                    >
                      Sign in
                    </Link>
                  </p>

                  {/* Social proof */}
                  <div className="flex items-center gap-2.5 rounded-[10px] border border-border bg-primary/5 px-4 py-3">
                    <div className="flex">
                      {["S", "A", "M"].map((initial, i) => (
                        <div
                          key={initial}
                          className="relative flex size-[26px] items-center justify-center rounded-full border-2 border-white bg-primary font-[var(--font-display)] text-[0.65rem] font-extrabold text-primary-foreground"
                          style={{
                            marginLeft: i > 0 ? -8 : 0,
                            zIndex: 3 - i,
                          }}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                    <p className="text-[0.775rem] font-light leading-snug text-muted-foreground">
                      <strong className="font-semibold text-foreground">
                        2,400+ professionals
                      </strong>{" "}
                      have joined Muvmnt across Canada.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <p className="mt-4 text-center text-[0.8rem] font-light text-muted-foreground">
                Looking to hire instead?{" "}
                <Link
                  href="/find-talent"
                  className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                >
                  Find Talent →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
