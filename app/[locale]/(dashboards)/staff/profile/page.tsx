import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { WorkerAccountProfile } from "@/features/profile/components/worker-account-profile";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getLocale } from "next-intl/server";
import { env } from "@/data/env/client";
import { ensureWorkerCalendarFeedToken } from "@/features/calendar/server/worker-calendar-feed";
import { WorkerCalendarSubscribeCard } from "@/features/calendar/components/worker-calendar-subscribe-card";

export default async function WorkerProfilePage() {
  const locale = await getLocale();
  const worker = await getWorkerProfile();
  if (!worker) return redirect({ href: "/onboarding/profile", locale });

  const t = await getTranslations("dashboard.worker.profile");

  const calendarToken = await ensureWorkerCalendarFeedToken(worker.id);
  const subscriptionUrl = `${env.NEXT_PUBLIC_APP_URL}/api/calendar/worker/${calendarToken}`;

  return (
    <div className="flex w-full max-w-5xl mx-auto flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>
      <WorkerCalendarSubscribeCard initialSubscriptionUrl={subscriptionUrl} />
      <WorkerAccountProfile
        worker={{
          first_name: worker.first_name,
          last_name: worker.last_name,
          date_of_birth: worker.date_of_birth,
          gender: worker.gender,
          profession: worker.profession,
          years_exp: worker.years_exp,
          photo_url: worker.photo_url,
          stage: worker.stage ?? null,
        }}
      />
    </div>
  );
}
