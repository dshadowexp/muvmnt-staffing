import {
  getWorkAuthorization,
  getWorkerProfile,
} from "@/features/profile/dal/queries";
import { AuthorizationClient } from "./_client";

export default async function AuthorizationPage() {
  const [workAuthorization, workerProfile] = await Promise.all([
    getWorkAuthorization(),
    getWorkerProfile(),
  ]);

  return (
    <>
      <AuthorizationClient
        initialWorkAuthorization={
          workAuthorization
            ? {
                type: workAuthorization.type,
                file_url: workAuthorization.file_url,
              }
            : null
        }
        initialWorkerPhotoUrl={workerProfile?.photo_url ?? null}
      />
    </>
  );
}
