import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { FinalizeSavedPaymentMethod } from "@/features/billing/components/finalize-saved-payment-method";
import {
  getBillingAccount,
  getPaymentMethods,
  getSuccessfulPaymentsForClient,
} from "@/features/billing/dal/queries";
import { ClientAccountBillingPanel } from "./_client";
import { PaymentsTable } from "./_payments-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function BillingContent() {
  const [pmRes, billingRes, t] = await Promise.all([
    getPaymentMethods(),
    getBillingAccount(),
    getTranslations("dashboard.client.billing"),
  ]);

  const paymentMethods =
    pmRes.error || !pmRes.data ? [] : pmRes.data;
  const billingSummary =
    billingRes.error || !billingRes.data
      ? null
      : { customerId: billingRes.data.customerId };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("cardsTitle")}</CardTitle>
        <CardDescription>{t("cardsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ClientAccountBillingPanel
          initialPaymentMethods={paymentMethods}
          billingSummary={billingSummary}
        />
      </CardContent>
    </Card>
  );
}

function BillingSkeleton() {
  return (
    <Card size="sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

async function PaymentHistory() {
  const payments = await getSuccessfulPaymentsForClient();
  return <PaymentsTable payments={payments} />;
}

function PaymentHistorySkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border p-4 space-y-3">
      <div className="flex gap-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-28" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export default async function ClientBillingPage() {
  const t = await getTranslations("dashboard.client.billing");
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <Suspense fallback={null}>
        <FinalizeSavedPaymentMethod />
      </Suspense>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {t("paymentHistory")}
        </h2>
        <p className="text-muted-foreground mt-1 mb-4 text-sm">
          {t("paymentHistorySubtitle")}
        </p>
        <Suspense fallback={<PaymentHistorySkeleton />}>
          <PaymentHistory />
        </Suspense>
      </div>
    </div>
  );
}
