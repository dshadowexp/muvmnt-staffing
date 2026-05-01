"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleDashedIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { createSubscriptionCheckoutAction } from "@/features/billing/actions";
import type { SubscriptionPlan, BillingPeriod } from "@/services/stripe/server";
import posthog from "posthog-js";

// ─── Static plan config (non-translated) ─────────────────────────────────────

const PLANS: { id: SubscriptionPlan; popular: boolean }[] = [
    { id: "starter",    popular: false },
    { id: "pro",        popular: true  },
    { id: "enterprise", popular: false },
];

// ─── Root component ───────────────────────────────────────────────────────────

export function PricingTiers({
    currentPlan,
}: {
    currentPlan?: SubscriptionPlan;
}) {
    const t = useTranslations("pricing.plans");
    const [period, setPeriod] = useState<BillingPeriod>("monthly");

    return (
        <>
            {/* Billing period toggle */}
            <div className="mb-8 flex justify-center">
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
                    <button
                        type="button"
                        onClick={() => setPeriod("monthly")}
                        className={cn(
                            "rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            period === "monthly"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {t("monthlyLabel")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriod("annual")}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            period === "annual"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {t("annualLabel")}
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            {t("annualBadge")}
                        </span>
                    </button>
                </div>
            </div>

            {/* Plan cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        id={plan.id}
                        popular={plan.popular}
                        isCurrent={plan.id === currentPlan}
                        period={period}
                        t={t}
                    />
                ))}
            </div>
        </>
    );
}

// ─── Individual plan card ─────────────────────────────────────────────────────

function PlanCard({
    id,
    popular,
    isCurrent,
    period,
    t,
}: {
    id: SubscriptionPlan;
    popular: boolean;
    isCurrent: boolean;
    period: BillingPeriod;
    t: ReturnType<typeof useTranslations<"pricing.plans">>;
}) {
    const { authUser } = useAuth();
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const name         = t(`${id}.name`);
    const price        = period === "annual" ? t(`${id}.priceAnnual`) : t(`${id}.price`);
    const description  = t(`${id}.description`);
    const features     = t.raw(`${id}.features`) as string[];
    const perMonth     = t("perMonth");
    const annualTotal  = period === "annual" ? (t.raw(`${id}.totalAnnual`) as string) : null;

    const ctaLabel = isCurrent
        ? t("currentPlan")
        : authUser
        ? t("ctaSignedIn", { name })
        : t("ctaSignedOut");

    function handleSelect() {
        if (isCurrent) return;

        posthog.capture("plan_selected", { plan: id, period });

        if (!authUser) {
            router.push("/sign-up");
            return;
        }

        startTransition(async () => {
            posthog.capture("subscription_checkout_started", { plan: id, period });
            const result = await createSubscriptionCheckoutAction(id, period);
            if (result && "error" in result) {
                toast.error(result.error);
            }
        });
    }

    return (
        <div
            className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6",
                popular
                    ? "border-primary/40 shadow-lg shadow-primary/8 ring-1 ring-primary/20"
                    : "border-border shadow-xs",
            )}
        >
            {/* Most-popular badge */}
            {popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                        {t("mostPopular")}
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="mb-5 pt-1">
                <p className={cn("mb-1 text-base font-semibold", popular && "text-primary")}>
                    {name}
                </p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
                <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-bold">{price}</span>
                    <span className="text-sm text-muted-foreground">{perMonth}</span>
                </div>
                {annualTotal ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t("billedAnnually", { total: annualTotal })}
                    </p>
                ) : null}
            </div>

            {/* CTA */}
            <Button
                type="button"
                variant={popular ? "default" : "outline"}
                className="mb-6 w-full"
                disabled={pending || isCurrent}
                onClick={handleSelect}
            >
                {pending ? (
                    <CircleDashedIcon className="mr-2 size-4 animate-spin" aria-hidden />
                ) : null}
                {ctaLabel}
            </Button>

            {/* Divider */}
            <div className="mb-5 h-px bg-border" />

            {/* Features */}
            <ul className="flex flex-col gap-3">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                            className={cn(
                                "mt-0.5 size-4 shrink-0",
                                popular ? "text-primary" : "text-primary/60",
                            )}
                            aria-hidden
                        />
                        <span className="text-foreground/80">{feature}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
