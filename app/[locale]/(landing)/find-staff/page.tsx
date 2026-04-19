import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BadgeCheck,
  Clock,
  ShieldCheck,
  Stethoscope,
  Timer,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FindStaffForm } from "./_form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "findStaff.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/find-staff" },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

const POINT_ICONS: Record<string, LucideIcon> = {
  Timer,
  BadgeCheck,
  ShieldCheck,
};

type Point = { icon: string; label: string };
type HowStep = { num: string; title: string; description: string };

export default async function FindStaffPage() {
  const t = await getTranslations("findStaff");
  const tCommon = await getTranslations("common");
  const points = t.raw("points") as Point[];
  const roles = t.raw("roles") as string[];
  const steps = t.raw("how.steps") as HowStep[];

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 pb-16 pt-10 lg:px-12 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.15)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <nav className="mb-8 flex items-center gap-2 text-xs font-light text-white/35">
            <Link
              href="/"
              className="text-white/40 no-underline transition-colors hover:text-white/60"
            >
              {tCommon("home")}
            </Link>
            <span>/</span>
            <span className="text-primary">{t("breadcrumb")}</span>
          </nav>

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(560px,1.6fr)] lg:gap-16">
            <div className="lg:max-w-[460px]">
              <Badge className="mb-6 gap-1.5 border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] text-[var(--teal-mid)]">
                {t("badge")}
              </Badge>

              <h1 className="mb-5 font-[var(--font-display)] text-[clamp(2.2rem,4vw,3.4rem)] font-extrabold leading-[1.08] tracking-tight text-white">
                {t("titleLead")}{" "}
                <span className="text-[var(--teal-mid)]">
                  {t("titleAccent")}
                </span>
                <br />
                {t("titleTail")}
              </h1>

              <p className="text-base font-light leading-[1.7] text-white/60">
                {t("subtitle")}
              </p>
            </div>

            <Card className="overflow-hidden rounded-2xl p-0 shadow-2xl">
              <div className="relative overflow-hidden bg-primary px-7 py-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_100%_100%,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="bg-primary-foreground/15 flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Users className="text-primary-foreground size-5" />
                  </div>
                  <div>
                    <p className="text-primary-foreground font-[var(--font-display)] text-lg font-extrabold leading-tight">
                      {t("card.title")}
                    </p>
                    <p className="text-primary-foreground/70 text-[0.82rem] font-light">
                      {t("card.subtitle")}
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-7">
                <FindStaffForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Trust strip (points) — bridges hero into the explainer ─── */}
      <section className="border-y bg-muted/30 px-6 py-6 lg:px-12">
        <ul className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {points.map((p) => {
            const Icon = POINT_ICONS[p.icon] ?? BadgeCheck;
            return (
              <li
                key={p.label}
                className="text-foreground/80 inline-flex items-center gap-2 text-sm font-medium"
              >
                <Icon className="text-primary size-4 shrink-0" />
                {p.label}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ─── How it works + roles + urgent CTA ─── */}
      <section className="bg-background px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-5xl space-y-14">
          {/* Steps */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl font-[var(--font-display)] text-sm font-extrabold">
                  {s.num}
                </div>
                <div>
                  <p className="text-foreground mb-1 font-[var(--font-display)] text-base font-bold">
                    {s.title}
                  </p>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Roles */}
          <div className="rounded-2xl border bg-card p-6 lg:p-8">
            <p className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-[1.5px]">
              {t("rolesLabel")}
            </p>
            <ul className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <li key={r}>
                  <span className="bg-muted/50 text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium">
                    <Stethoscope className="text-primary size-3.5" />
                    {r}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
