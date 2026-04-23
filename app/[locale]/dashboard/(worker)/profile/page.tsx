import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { WorkerAccountProfile } from "@/features/profile/components/worker-account-profile";
import { getWorkerProfile } from "@/features/profile/dal/queries";

export default async function WorkerProfilePage() {
  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const t = await getTranslations("dashboard.worker.profile");

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
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
      />
    </div>
  );
}
