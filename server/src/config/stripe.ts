import Stripe from "stripe";
import { config } from "./env";

export const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
});
