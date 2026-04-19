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
    premium: "price_1S59rEAQ8LO0b8GGageAqzMu",
    pro: "price_1S59rZAQ8LO0b8GG7EngHjNX",
} as const;
