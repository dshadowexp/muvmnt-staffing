import { getWorkerProfile } from "@/features/profile/dal/queries";
import { ProfileClient } from "./_client";
import type { AddressLocation } from "@/features/geo/types";
import type { WorkerProfileFormInput } from "@/features/profile/schemas/worker";

export default async function ProfilePage() {
  const row = await getWorkerProfile();

  const workerProfile: WorkerProfileFormInput | null = row
    ? {
        first_name:    row.first_name,
        last_name:     row.last_name,
        date_of_birth: row.date_of_birth,
        gender:        row.gender,
        profession:    row.profession,
        years_exp:     row.years_exp,
        address:       (row.address as AddressLocation | null) ?? null,
      }
    : null;

  return <ProfileClient workerProfile={workerProfile} />;
}
