import { FinalizeSavedPaymentMethod } from "@/features/payments/billing/components/finalize-saved-payment-method";
import { getPaymentMethods } from "@/features/payments/billing/dal/queries";
import { BillingClient } from "./_client";
import { Suspense } from "react";

export default async function BillingPage() {
  const { error, data } = await getPaymentMethods();

  if (error) {
    return (
      <>
        <div className="text-red-500">{error}</div>
      </>
    )
  }

  return (
    <>
      <Suspense fallback={null}>
        <FinalizeSavedPaymentMethod />
      </Suspense>
      <BillingClient initialPaymentMethods={data ?? []} />
    </>
  );
}
