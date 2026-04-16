"use client";

import { ClientAccountDetailsForm } from "@/features/account/components/client-account-details-form";
import type { AddressLocation } from "@/features/geo/types";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddressCard } from "@/features/geo/components/address-card";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { upsertLocationAction } from "@/features/geo/dal/mutations";

export function ClientAccountProfile({
  client,
  location,
}: {
  client: ClientProfileFormInput | null;
  location: AddressLocation | null | undefined;
}) {
  const router = useRouter();

  async function handleAddressChange(loc: AddressLocation) {
    const { error, message } = await upsertLocationAction(loc);
    if (error) {
      toast.error(message);
      return;
    }
    toast.success(message);
    router.refresh();
  }
  
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
          <AddressCard
            value={location ?? undefined}
            onChange={handleAddressChange}
            label="Your address"
          />
        </CardContent>
      </Card>
    </div>
  );
}
