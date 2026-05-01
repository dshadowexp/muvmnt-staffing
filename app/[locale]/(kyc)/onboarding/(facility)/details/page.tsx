import { getFacilityProfile } from "@/features/profile/dal/queries";
import { OrganizationClient } from "./_client";
import type { AddressLocation } from "@/features/geo/types";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";

export default async function OrganizationPage() {
    const row = await getFacilityProfile();

    const clientProfile: ClientProfileFormInput | null = row
        ? {
              id:      row.id,
              name:    row.name,
              type:    row.type,
              address: (row.address as AddressLocation | null) ?? null,
              domains: row.domains ?? null,
          }
        : null;

    return <OrganizationClient clientProfile={clientProfile} />;
}
