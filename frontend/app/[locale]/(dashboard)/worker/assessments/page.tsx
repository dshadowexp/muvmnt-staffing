import { getCertifications, getWorkerProfile } from "@/features/profile/dal/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkerAssessmentsHub } from "./_client";

export default async function WorkerAssessmentsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "worker") redirect("/app");

  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const rows = await getCertifications();

  return (
    <div className="flex w-full max-w-5xl flex-col">
      <WorkerAssessmentsHub
        profession={worker.profession ?? ""}
        initialCertifications={rows.map((c) => ({
          id: c.id,
          name: c.name,
          file_url: c.file_url,
          is_verified: c.is_verified === true,
        }))}
      />
    </div>
  );
}
