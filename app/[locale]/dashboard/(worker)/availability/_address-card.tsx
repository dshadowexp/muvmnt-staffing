"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { AddressCard } from "@/features/geo/components/address-card";
import type { AddressLocation } from "@/features/geo/types";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { Card, CardContent } from "@/components/ui/card";

export function WorkerAvailabilityAddressCard({
  locationPromise,
}: {
  locationPromise: Promise<AddressLocation | null | undefined>;
}) {
  const location = use(locationPromise);
  const router = useRouter();
  const t = useTranslations("dashboard.worker.availability");

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
    <Card className="border-border/80 transition-colors hover:border-primary/40 hover:bg-muted/30">
      <CardContent className="flex flex-col gap-3">
        <p className="font-semibold">{t("addressTitle")}</p>
        <AddressCard
          value={location ?? undefined}
          onChange={handleAddressChange}
        />
      </CardContent>
    </Card>
  );
}
