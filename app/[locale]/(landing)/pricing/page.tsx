import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PricingClient } from "./_client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function PricingPage() {
  return <PricingClient />;
}
