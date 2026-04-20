"use client";

import { Suspense, use } from "react";
import { toast } from "sonner";
import { OrganizationCard } from "@/features/account/components/organization-card";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import type { AddressLocation } from "@/features/geo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressCard } from "@/features/geo/components/address-card";
import { useRouter } from "@/i18n/navigation";
import { upsertLocationAction } from "@/features/geo/dal/mutations";

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
  const location = use(locationPromise);

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
    <Card size="sm">
      <CardHeader>
        <CardTitle>Address</CardTitle>
        <CardDescription>
          This is where your shifts will be posted and workers will be matched.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AddressCard
          value={location ?? undefined}
          onChange={handleAddressChange}
        />
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
