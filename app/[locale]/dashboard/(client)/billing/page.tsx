import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ClientAccountBillingPanel } from "./_client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

export default async function ClientBillingPage() {
  const t = await getTranslations("dashboard.client.billing");
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <Suspense fallback={<BillingSkeleton />}>
        <ClientAccountBillingPanel />
      </Suspense>
    </div>
  );
}
