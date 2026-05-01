"use client";

import { Suspense, use } from "react";
import { OrganizationCard } from "@/features/account/components/organization-card";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientAccountProfile({
  clientProfilePromise,
}: {
  clientProfilePromise: Promise<ClientProfileFormInput | null>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<CardSkeleton lines={3} />}>
        <OrganizationSlot clientProfilePromise={clientProfilePromise} />
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

function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3 pt-6">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

