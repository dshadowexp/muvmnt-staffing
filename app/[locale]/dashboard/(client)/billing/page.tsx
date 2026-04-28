import { getSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { getSubscription } from "@/features/billing/dal/subscriptions";
import { BillingPanel } from "./_client";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { facilityId } = session;
  const subscription = facilityId ? await getSubscription(facilityId) : null;

  return (
    <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your subscription and billing details.
        </p>
      </div>
      <BillingPanel subscription={subscription} />
    </div>
  );
}
