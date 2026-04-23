import { hasPaymentMethod } from "@/features/payments/billing/dal/queries";
import { BillingClient } from "./_client";

export default async function BillingPage() {
  const { error, data } = await hasPaymentMethod();

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }
  
  return <BillingClient hasPaymentMethod={data ?? false} />;
}
