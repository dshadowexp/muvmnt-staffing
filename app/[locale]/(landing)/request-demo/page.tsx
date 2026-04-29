import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CalendarCheck, CheckCircle2, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { RequestDemoForm } from "./_client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "requestDemo.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/request-demo" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
    },
  };
}

const BULLET_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Users,
  CalendarCheck,
  CheckCircle2,
};

export default async function RequestDemoPage() {
  const t = await getTranslations("requestDemo");
  const tCommon = await getTranslations("common");
  const bullets = t.raw("bullets") as Array<{
    icon: string;
    title: string;
    description: string;
  }>;

  return (
    <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 pb-16 pt-10 lg:px-12 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.15)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-10 flex items-center gap-2 text-xs font-light text-white/35">
          <Link
            href="/"
            className="text-white/40 no-underline transition-colors hover:text-white/60"
          >
            {tCommon("home")}
          </Link>
          <span>/</span>
          <span className="text-primary">{t("breadcrumb")}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="max-w-xl pt-2">
            <Badge
              variant="secondary"
              className="mb-5 h-7 rounded-full border border-primary/25 bg-primary/15 px-3 text-[0.68rem] font-semibold uppercase tracking-[2.5px] text-primary"
            >
              {t("hero.overline")}
            </Badge>
            <h1 className="font-[var(--font-display)] text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.1] tracking-tight text-white">
              {t("hero.titleLead")}{" "}
              <span className="text-primary">{t("hero.titleAccent")}</span>
            </h1>
            <p className="mt-4 text-lg font-light leading-relaxed text-white/65">
              {t("hero.subtitle")}
            </p>

            <ul className="mt-10 space-y-5">
              {bullets.map((b) => {
                const Icon = BULLET_ICONS[b.icon] ?? CheckCircle2;
                return (
                  <li key={b.title} className="flex gap-4">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                      <Icon className="size-4 text-primary" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-white">{b.title}</p>
                      <p className="mt-1 text-[0.9rem] font-light leading-relaxed text-white/55">
                        {b.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <Card className="overflow-hidden border-border/60">
            <RequestDemoForm />
          </Card>
        </div>
      </div>
    </section>
  );
}
