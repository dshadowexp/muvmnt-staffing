import { getWorkerProfile } from "@/features/profile/dal/queries";
import { ProfileClient } from "./_client";

export default async function ProfilePage() {

  const workerProfile = await getWorkerProfile();

  return (
    <>
      <ProfileClient workerProfile={workerProfile ?? null} />
    </>
  );
}
