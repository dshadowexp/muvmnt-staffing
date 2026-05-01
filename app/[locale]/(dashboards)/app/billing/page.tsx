import { getSession } from "@/lib/get-session";
import { redirect } from "@/i18n/navigation";
import { getSubscription } from "@/features/billing/dal/subscriptions";
import {
  getDefaultPaymentMethodSummaryForFacility,
  listStripeInvoicesForFacility,
} from "@/features/billing/dal/payment-methods";
import { createAdminClient } from "@/supabase/server";
import { BillingPanel } from "./_client";
import { getLocale, getTranslations } from "next-intl/server";

export default async function BillingPage() {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });

  const { facilityId } = session;
  const t = await getTranslations("dashboard.client.billing");

  const subscription = facilityId ? await getSubscription(facilityId) : null;

  let facilityName: string | null = null;
  if (facilityId) {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("facilities")
      .select("name")
      .eq("id", facilityId)
      .maybeSingle();
    facilityName = data?.name ?? null;
  }

  let invoices: Awaited<ReturnType<typeof listStripeInvoicesForFacility>> = [];
  let defaultCard: Awaited<
    ReturnType<typeof getDefaultPaymentMethodSummaryForFacility>
  > = null;

  if (facilityId) {
    try {
      [invoices, defaultCard] = await Promise.all([
        listStripeInvoicesForFacility(facilityId),
        getDefaultPaymentMethodSummaryForFacility(facilityId),
      ]);
    } catch {
      invoices = [];
      defaultCard = null;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("subscriptionPageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subscriptionPageSubtitle")}
        </p>
      </div>
      <BillingPanel
        facilityName={facilityName}
        subscription={subscription}
        invoices={invoices}
        defaultCard={defaultCard}
      />
    </div>
  );
}
