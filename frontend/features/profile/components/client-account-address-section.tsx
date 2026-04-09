"use client";

import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { AddressCard } from "@/features/geo/components/address-card";
import type { AddressLocation } from "@/features/geo/types";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

export function ClientAccountAddressSection({
  location,
  label = "Organization address",
}: {
  location: AddressLocation | null | undefined;
  label?: string;
}) {
  const router = useRouter();

  async function handleAddressChange(loc: AddressLocation) {
    const { error, message } = await upsertLocationAction(loc);
    if (error) {
      toast.error(message);
      return;
    }
    toast.success(message);
    router.refresh();
  }

  return (
    <AddressCard
      value={location ?? undefined}
      onChange={handleAddressChange}
      label={label}
    />
  );
}
