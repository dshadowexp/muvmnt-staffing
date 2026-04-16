import type { Json } from "@/services/supabase/types/database";

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

/** Builds a short label from `payments.payment_method` jsonb (card snapshot written at charge time). */
export function cardDisplayFromPaymentMethodJson(raw: Json | null | undefined): string | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const brand = typeof o.brand === "string" ? o.brand : "";
  const last4 = typeof o.last4 === "string" ? o.last4 : "";
  if (brand === "" || last4 === "") return null;
  const label =
    CARD_BRAND_LABELS[brand] ?? brand.replace(/^./, (c) => c.toUpperCase());
  return `${label} · ${last4}`;
}
