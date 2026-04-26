import { getTranslations } from "next-intl/server";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { getClientProfile } from "@/features/profile/dal/queries";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import { ClientAccountBillingPanel, ClientAccountProfile } from "./_client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export default async function ClientAccountPage() {
  const clientProfilePromise: Promise<ClientProfileFormInput | null> =
    getClientProfile().then((row) =>
      row ? { id: row.id, name: row.name, type: row.type } : null,
    );
  clientProfilePromise.catch(() => undefined);

  const locationPromise = getAddressLocation().then((l) => l ?? null);
  locationPromise.catch(() => undefined);

  const tAccount = await getTranslations("dashboard.client.account");
  const tBilling = await getTranslations("dashboard.client.billing");

  return (
    <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{tAccount("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{tAccount("subtitle")}</p>
      </div>
      <ClientAccountProfile
        clientProfilePromise={clientProfilePromise}
        locationPromise={locationPromise}
      />
      <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{tBilling("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{tBilling("subtitle")}</p>
      </div>

      <Suspense fallback={<BillingSkeleton />}>
        <ClientAccountBillingPanel />
      </Suspense>
    </div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-full shrink-0 rounded-md sm:w-40" />
      </CardContent>
    </Card>
  );
}