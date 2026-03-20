import { getWorkAuthorization } from "@/features/profile/dal/queries";
import { AuthorizationClient } from "./_client";

export default async function AuthorizationPage() {
  const workAuthorization = await getWorkAuthorization();

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
      />
    </>
  );
}
