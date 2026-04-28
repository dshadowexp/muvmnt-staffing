import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import { getOperators, getPendingInvites } from "@/features/account/dal/queries";
import type { ClientProfileFormInput } from "@/features/account/schemas/client";
import type { AddressLocation } from "@/features/geo/types";
import { ClientAccountProfile } from "./_client";
import { OperatorsTable } from "@/features/account/components/operators-table";

export default async function ClientAccountPage() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId, facilityId } = session;

  const clientProfilePromise: Promise<ClientProfileFormInput | null> =
    getFacilityProfile().then((row) =>
      row
        ? {
            id:      row.id,
            name:    row.name,
            type:    row.type,
            address: (row.address as AddressLocation | null) ?? null,
          }
        : null,
    );
  clientProfilePromise.catch(() => undefined);

  const [operators, pendingInvites] = await Promise.all([
    facilityId ? getOperators(facilityId) : Promise.resolve([]),
    facilityId ? getPendingInvites(facilityId) : Promise.resolve([]),
  ]);

  const tAccount = await getTranslations("dashboard.client.account");

  return (
    <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{tAccount("title")}</h1>
      </div>

      <ClientAccountProfile clientProfilePromise={clientProfilePromise} />

      <OperatorsTable
        operators={operators}
        pendingInvites={pendingInvites}
        currentUserId={userId}
      />
    </div>
  );
}