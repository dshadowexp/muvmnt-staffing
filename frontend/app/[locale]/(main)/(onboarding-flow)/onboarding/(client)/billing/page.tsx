import { getPaymentMethods } from "@/features/billing/dal/queries";
import { BillingClient } from "./_client";

export default async function BillingPage() {
  const { error, data } = await getPaymentMethods();
  console.log("error", error);

  if (error) {
    return (
      <>
        <div className="text-red-500">{error}</div>
      </>
    )
  }

  return (
    <>
      <BillingClient initialPaymentMethods={data ?? []} />
    </>
  )
}
