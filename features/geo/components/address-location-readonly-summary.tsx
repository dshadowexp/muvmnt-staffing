"use client";

import { useTranslations } from "next-intl";
import type { AddressLocation } from "@/features/geo/types";

type RowProps = { label: string; value: string | null | undefined };

function Row({ label, value }: RowProps) {
  const display = value?.trim() ? value : "—";
  return (
    <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="text-foreground text-sm">{display}</dd>
    </div>
  );
}

type AddressLocationReadonlySummaryProps = {
  location: AddressLocation;
};

/**
 * Read-only display of all client address fields collected at onboarding.
 */
export function AddressLocationReadonlySummary({
  location,
}: AddressLocationReadonlySummaryProps) {
  const t = useTranslations("dashboard.client.account.address");

  return (
    <dl className="space-y-3">
      <Row label={t("formattedAddress")} value={location.address} />
      <Row label={t("suite")} value={location.addressLine2} />
      <Row label={t("postalCode")} value={location.postalCode} />
      <Row label={t("instructions")} value={location.instructions} />
    </dl>
  );
}
