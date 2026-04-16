import { WorkerAccountProfile } from "@/features/profile/components/worker-account-profile";
import { getWorkAuthorization, getWorkerProfile } from "@/features/profile/dal/queries";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { redirect } from "next/navigation";

export default async function WorkerProfilePage() {
  const [worker, workAuthorization] = await Promise.all([
    getWorkerProfile(),
    getWorkAuthorization(),
  ]);
  if (!worker) redirect("/onboarding/profile");

  let location: Awaited<ReturnType<typeof getAddressLocation>> | undefined;
  try {
    location = await getAddressLocation();
  } catch {
    location = undefined;
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your worker profile and work authorization. Certifications and
          assessments live under Assessments.
        </p>
      </div>
      <WorkerAccountProfile
        worker={{
          first_name: worker.first_name,
          last_name: worker.last_name,
          date_of_birth: worker.date_of_birth,
          gender: worker.gender,
          profession: worker.profession,
          years_exp: worker.years_exp,
        }}
        location={location ?? null}
        workAuthorization={
          workAuthorization
            ? {
                type: workAuthorization.type,
                file_url: workAuthorization.file_url,
                is_verified: workAuthorization.is_verified === true,
              }
            : null
        }
      />
    </div>
  );
}
