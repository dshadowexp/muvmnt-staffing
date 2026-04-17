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
      <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 pb-16 pt-10 lg:px-12 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.15)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
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

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_minmax(420px,520px)] lg:gap-16">
            <div className="lg:pt-6">
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

              <p className="mb-8 max-w-[520px] text-base font-light leading-[1.7] text-white/60">
                {t("subtitle")}
              </p>

              <ul className="mb-10 flex flex-wrap gap-4">
                {points.map((p) => {
                  const Icon = POINT_ICONS[p.icon] ?? BadgeCheck;
                  return (
                    <li
                      key={p.label}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70"
                    >
                      <Icon className="size-4 text-[var(--teal-mid)]" />
                      {p.label}
                    </li>
                  );
                })}
              </ul>

              <div className="hidden lg:block">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[1.5px] text-white/45">
                  {t("rolesLabel")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70"
                    >
                      <Stethoscope className="size-3.5 text-[var(--teal-mid)]" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Card className="overflow-hidden rounded-2xl p-0 shadow-2xl">
              <div className="relative overflow-hidden bg-primary px-7 py-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_100%_100%,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
                    <Users className="size-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-[var(--font-display)] text-lg font-extrabold leading-tight text-primary-foreground">
                      {t("card.title")}
                    </p>
                    <p className="text-[0.82rem] font-light text-primary-foreground/70">
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

      <section className="border-t bg-background px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-[var(--font-display)] text-sm font-extrabold text-primary">
                {s.num}
              </div>
              <div>
                <p className="mb-1 font-[var(--font-display)] text-base font-bold text-foreground">
                  {s.title}
                </p>
                <p className="text-sm font-light leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-5xl rounded-2xl border bg-muted/30 p-6 text-center">
          <p className="mb-1 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="size-4 text-primary" />
            {t("urgent.title")}
          </p>
          <p className="mb-4 text-sm font-light text-muted-foreground">
            {t("urgent.description")}
          </p>
        </div>
      </section>
    </>
  );
}
