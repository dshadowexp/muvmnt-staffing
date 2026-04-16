import { FinalizeSavedPaymentMethod } from "@/features/billing/components/finalize-saved-payment-method";
import { getBillingAccount, getPaymentMethods } from "@/features/billing/dal/queries";
import { ClientAccountBillingPanel } from "./_client";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ClientBillingPage() {
  const [pmRes, billingRes] = await Promise.all([
    getPaymentMethods(),
    getBillingAccount(),
  ]);

  const paymentMethods =
    pmRes.error || !pmRes.data ? [] : pmRes.data;
  const billingSummary =
    billingRes.error || !billingRes.data
      ? null
      : { customerId: billingRes.data.customerId };

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <Suspense fallback={null}>
        <FinalizeSavedPaymentMethod />
      </Suspense>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Payment methods on file for your subscription.
        </p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Payment methods</CardTitle>
          <CardDescription>
            Manage cards and your Stripe billing customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientAccountBillingPanel
            initialPaymentMethods={paymentMethods}
            billingSummary={billingSummary}
          />
        </CardContent>
      </Card>
    </div>
  );
}
