import { getAddressLocation } from "@/features/geo/dal/queries";
import { ClientAccountProfile } from "./_client";
import { getClientProfile } from "@/features/profile/dal/queries";

export default async function ClientAccountPage() {
  const clientRow = await getClientProfile();
  let location: Awaited<ReturnType<typeof getAddressLocation>> | undefined;
  try {
    location = await getAddressLocation();
  } catch {
    location = undefined;
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organization profile and address.
        </p>
      </div>
      <ClientAccountProfile
        client={
          clientRow
            ? {
                id: clientRow.id,
                name: clientRow.name,
                type: clientRow.type,
              }
            : null
        }
        location={location ?? null}
      />
    </div>
  );
}
