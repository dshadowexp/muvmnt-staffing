import "server-only";
import { env } from "@/data/env/server";
import Stripe from "stripe";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
});

export const getStripeServer = () => {
    return stripe;
}

export const STRIPE_PRICE_IDS = {
    starter:            env.STRIPE_PRICE_ID_STARTER,
    pro:                env.STRIPE_PRICE_ID_PRO,
    enterprise:         env.STRIPE_PRICE_ID_ENTERPRISE,
    starter_annual:     env.STRIPE_PRICE_ID_STARTER_ANNUAL,
    pro_annual:         env.STRIPE_PRICE_ID_PRO_ANNUAL,
    enterprise_annual:  env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL,
} as const;

export type SubscriptionPlan  = "starter" | "pro" | "enterprise";
export type BillingPeriod     = "monthly" | "annual";

/** Returns the Stripe price ID for the given plan + billing period. */
export function getPriceId(plan: SubscriptionPlan, period: BillingPeriod): string {
    const key = period === "annual" ? `${plan}_annual` : plan;
    return STRIPE_PRICE_IDS[key as keyof typeof STRIPE_PRICE_IDS];
}
