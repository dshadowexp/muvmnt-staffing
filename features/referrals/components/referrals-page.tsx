import { getTranslations } from "next-intl/server";
import {
  ReferralView,
  type ReferralRole,
} from "@/features/referrals/components/referral-view";

/**
 * Full-page referrals view rendered inside `(dashboard)/{role}/referrals`.
 *
 * Server component: fetches translations and hands them off to the shared
 * client `ReferralView`. Each role gets a tuned subtitle but everything else
 * stays in lock-step with the dialog version.
 */
export async function ReferralsPage({ role }: { role: ReferralRole }) {
  const t = await getTranslations("referral.page");
  const subtitle =
    role === "worker"
      ? t("subtitleWorker")
      : role === "client"
        ? t("subtitleClient")
        : t("subtitleAdmin");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
      </div>

      <ReferralView role={role} />
    </div>
  );
}
