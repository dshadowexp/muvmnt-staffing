"use client";

import { Suspense, use, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { OrganizationCard } from "@/features/account/components/organization-card";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import type { AddressLocation } from "@/features/geo/types";
import { AddressLocationReadonlySummary } from "@/features/geo/components/address-location-readonly-summary";
import { AddressCard } from "@/features/geo/components/address-card";
import { ClientLocationDetailInputs } from "@/features/geo/components/client-location-detail-inputs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { Pencil } from "lucide-react";

export function ClientAccountProfile({
  clientProfilePromise,
  locationPromise,
}: {
  clientProfilePromise: Promise<ClientProfileFormInput | null>;
  locationPromise: Promise<AddressLocation | null | undefined>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<CardSkeleton lines={2} />}>
        <OrganizationSlot clientProfilePromise={clientProfilePromise} />
      </Suspense>
      <Suspense fallback={<CardSkeleton lines={2} />}>
        <AddressSlot locationPromise={locationPromise} />
      </Suspense>
    </div>
  );
}

function OrganizationSlot({
  clientProfilePromise,
}: {
  clientProfilePromise: Promise<ClientProfileFormInput | null>;
}) {
  const client = use(clientProfilePromise);
  return <OrganizationCard client={client} />;
}

function AddressSlot({
  locationPromise,
}: {
  locationPromise: Promise<AddressLocation | null | undefined>;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.client.account.address");
  const location = use(locationPromise);
  const [editing, setEditing] = useState(!location);

  async function persistQuiet(next: AddressLocation): Promise<boolean> {
    const { error, message } = await upsertLocationAction(next);
    if (error) {
      toast.error(message);
      return false;
    }
    return true;
  }

  async function persistWithToast(next: AddressLocation): Promise<boolean> {
    const { error, message } = await upsertLocationAction(next);
    if (error) {
      toast.error(message);
      return false;
    }
    toast.success(message);
    return true;
  }

  async function handleAddressChange(loc: AddressLocation) {
    const ok = await persistWithToast(loc);
    if (ok) router.refresh();
  }

  function handleDoneEditing() {
    setEditing(false);
    router.refresh();
  }

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </div>
        {location && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="shrink-0"
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!location || editing ? (
          <>
            <AddressCard value={location ?? undefined} onChange={handleAddressChange} />
            <ClientLocationDetailInputs
              location={location ?? null}
              onPersist={persistQuiet}
            />
            {location ? (
              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={handleDoneEditing}>
                  {t("doneEditing")}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <AddressLocationReadonlySummary location={location} />
        )}
      </CardContent>
    </Card>
  );
}

function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card size="sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
