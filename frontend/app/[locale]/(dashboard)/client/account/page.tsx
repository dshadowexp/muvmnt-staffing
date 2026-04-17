import { getTranslations } from "next-intl/server";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { getClientProfile } from "@/features/profile/dal/queries";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import { ClientAccountProfile } from "./_client";

export default async function ClientAccountPage() {
  const clientProfilePromise: Promise<ClientProfileFormInput | null> =
    getClientProfile().then((row) =>
      row ? { id: row.id, name: row.name, type: row.type } : null,
    );
  clientProfilePromise.catch(() => undefined);

  const locationPromise = getAddressLocation().then((l) => l ?? null);
  locationPromise.catch(() => undefined);

  const t = await getTranslations("dashboard.client.account");

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>
      <ClientAccountProfile
        clientProfilePromise={clientProfilePromise}
        locationPromise={locationPromise}
      />
    </div>
  );
}
