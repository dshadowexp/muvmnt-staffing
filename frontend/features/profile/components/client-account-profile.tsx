"use client";

import { ClientAccountAddressSection } from "@/features/profile/components/client-account-address-section";
import { ClientAccountBillingPanel } from "@/features/profile/components/client-account-billing-panel";
import { ClientAccountDetailsForm } from "@/features/profile/components/client-account-details-form";
import type { AddressLocation } from "@/features/geo/types";
import type { ClientProfileFormInput } from "@/features/profile/schemas/client";
import type { PaymentMethodCardType } from "@/features/billing/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ClientAccountProfile({
  client,
  location,
  paymentMethods,
  billingSummary,
}: {
  client: ClientProfileFormInput | null;
  location: AddressLocation | null | undefined;
  paymentMethods: PaymentMethodCardType[];
  billingSummary: { customerId: string } | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Your facility or business name and type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientAccountDetailsForm client={client} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>
            Location used for jobs and compliance. Changes save when you finish
            editing the address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientAccountAddressSection location={location} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Payment methods on file for your subscription.
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
