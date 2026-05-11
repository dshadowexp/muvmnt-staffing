import type { ElementType } from "react";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangleIcon,
  CheckIcon,
  CircleDotIcon,
  ClockIcon,
  LayersIcon,
  LockIcon,
  StethoscopeIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Factor = { icon: string; label: string; detail: string };
type StaffTier = { key: string; name: string; tagline: string; detail: string };
type BillingStep = { num: string; label: string; detail: string };

const FACTOR_ICONS: Record<string, ElementType> = {
  stethoscope: StethoscopeIcon,
  clock: ClockIcon,
  "trending-up": TrendingUpIcon,
  layers: LayersIcon,
};

const STAFF_TIER_COLORS: Record<string, string> = {
  pulse: "bg-primary/8 border-primary/20 text-primary",
  vetted: "bg-blue-500/8 border-blue-500/20 text-blue-600",
  veteran: "bg-violet-500/8 border-violet-500/20 text-violet-600",
};

const BILLING_STEP_BG = [
  "bg-primary/10 text-primary",
  "bg-primary/16 text-primary",
  "bg-primary/22 text-primary",
  "bg-primary/28 text-primary",
];

export async function PricingStaffingSection() {
  const t = await getTranslations("pricing");
  const factors = t.raw("staffing.factors") as Factor[];
  const staffTiers = t.raw("staffing.tiers") as StaffTier[];
  const billingSteps = t.raw("staffing.steps") as BillingStep[];

  return (
    <section className="mb-20">
      <div className="mb-10 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
            {t("staffing.badge")}
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("staffing.title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("staffing.subtitle")}</p>
        </div>
      </div>

      {/* How rates are set */}
      <div className="mb-10">
        <p className="mb-1 text-sm font-semibold">{t("staffing.ratesTitle")}</p>
        <p className="mb-5 text-xs text-muted-foreground">{t("staffing.ratesSubtitle")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {factors.map((factor) => {
            const Icon = FACTOR_ICONS[factor.icon] ?? LayersIcon;
            return (
              <div
                key={factor.icon}
                className="flex gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-medium">{factor.label}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{factor.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff tiers */}
      <div className="mb-10">
        <p className="mb-5 text-sm font-semibold">{t("staffing.tiersTitle")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {staffTiers.map((tier) => (
            <div
              key={tier.key}
              className={cn(
                "rounded-xl border p-4",
                STAFF_TIER_COLORS[tier.key] ?? "bg-muted/40 border-border text-foreground",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <CircleDotIcon className="size-3.5 opacity-70" />
                <span className="text-sm font-semibold">{tier.name}</span>
                <span className="ml-auto rounded-full border border-current/20 bg-background/60 px-2 py-0.5 text-xs font-medium opacity-80">
                  {tier.tagline}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-80">{tier.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-3">
          <LockIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t("staffing.lockNote")}</p>
        </div>
      </div>

      {/* Billing process */}
      <div>
        <p className="mb-1 text-sm font-semibold">{t("staffing.billingTitle")}</p>
        <p className="mb-6 text-xs text-muted-foreground">{t("staffing.billingSubtitle")}</p>

        <div className="relative grid gap-0 sm:grid-cols-4">
          <div
            className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-border sm:block"
            aria-hidden
          />
          {billingSteps.map((step, i) => (
            <div key={step.num} className="flex flex-col items-center px-3 text-center">
              <div
                className={cn(
                  "relative z-10 mb-3 flex size-10 items-center justify-center rounded-full text-xs font-bold",
                  BILLING_STEP_BG[i],
                )}
              >
                {step.num}
              </div>
              <p className="mb-1 text-xs font-semibold">{step.label}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-3">
            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">{t("staffing.billingNote")}</p>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-3">
            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">{t("staffing.netTermsNote")}</p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-3">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <div>
            <p className="mb-0.5 text-xs font-semibold text-warning-foreground">
              {t("staffing.surgeBadge")}
            </p>
            <p className="text-xs text-muted-foreground">{t("staffing.surgeExplain")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
