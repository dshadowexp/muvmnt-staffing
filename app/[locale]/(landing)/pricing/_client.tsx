"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "annual";

interface ScreeningTier {
  key: "free" | "starter" | "pro";
  priceMonthly: number;
  priceAnnual: number;
  annualTotal: number;
  popular: boolean;
}

const SCREENING_TIERS: ScreeningTier[] = [
  { key: "free",    priceMonthly: 0,   priceAnnual: 0,   annualTotal: 0,    popular: false },
  { key: "starter", priceMonthly: 79,  priceAnnual: 63,  annualTotal: 756,  popular: true  },
  { key: "pro",     priceMonthly: 199, priceAnnual: 159, annualTotal: 1908, popular: false },
];

export function ScreeningTiers() {
  const t = useTranslations("pricing");
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <>
      {/* Billing toggle */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              billing === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("hero.monthlyLabel")}
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              billing === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("hero.annualLabel")}
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {t("hero.annualBadge")}
            </span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {SCREENING_TIERS.map((tier) => {
          const price = billing === "monthly" ? tier.priceMonthly : tier.priceAnnual;
          const isFree    = tier.key === "free";
          const isStarter = tier.key === "starter";
          const features  = t.raw(`tiers.${tier.key}.features`) as string[];

          return (
            <div
              key={tier.key}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6",
                tier.popular
                  ? "border-primary/40 shadow-lg shadow-primary/8 ring-1 ring-primary/20"
                  : "border-border shadow-xs",
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    {t("tiers.mostPopular")}
                  </span>
                </div>
              )}

              <div className="mb-5 pt-1">
                <p className={cn("mb-1 text-base font-semibold", isStarter && "text-primary")}>
                  {t(`tiers.${tier.key}.name`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`tiers.${tier.key}.description`)}
                </p>
              </div>

              <div className="mb-6">
                {isFree ? (
                  <span className="text-3xl font-bold">{t("hero.free")}</span>
                ) : (
                  <>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-medium text-muted-foreground">C$</span>
                      <span className="text-3xl font-bold">{price}</span>
                      <span className="text-sm text-muted-foreground">{t("hero.perMonth")}</span>
                    </div>
                    {billing === "annual" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("hero.billedAnnually", { total: tier.annualTotal })}
                      </p>
                    )}
                  </>
                )}
              </div>

              <Button className="mb-6 w-full" variant={tier.popular ? "default" : "outline"}>
                {t(`tiers.${tier.key}.cta`)}
              </Button>

              <div className="mb-5 h-px bg-border" />

              <ul className="flex flex-col gap-3">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        isStarter ? "text-primary" : "text-primary/60",
                      )}
                    />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
