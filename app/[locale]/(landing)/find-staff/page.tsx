import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  BadgeCheck,
  ShieldCheck,
  Stethoscope,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LandingAuthCtas } from "../_components/landing-auth-ctas";
import { FindStaffLeadCard } from "./_form";

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

          <div className="mx-auto w-full max-w-3xl">
            <Card className="overflow-hidden rounded-2xl p-0 shadow-2xl">
              <FindStaffLeadCard
                cardTitle={t("card.title")}
                cardSubtitle={t("card.subtitle")}
              />
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

          <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
            <div className="max-w-xl">
              <p className="text-primary mb-2 text-xs font-semibold uppercase tracking-[1.5px]">
                {t("account.overline")}
              </p>
              <h2 className="font-[var(--font-display)] text-[clamp(1.25rem,2.5vw,1.5rem)] font-extrabold tracking-tight text-foreground">
                {t("account.title")}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm font-light leading-relaxed">
                {t("account.description")}
              </p>
            </div>
            <LandingAuthCtas
              signUpHref="/sign-up?as=client"
              ctaCreateLabel={t("account.ctaCreate")}
              ctaSignInLabel={t("account.ctaSignIn")}
              variant="onLight"
            />
          </div>
        </div>
      </section>
    </>
  );
}
