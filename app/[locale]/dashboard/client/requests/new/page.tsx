import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BackLink } from "@/components/back-link";
import { getAddressLocation } from "@/features/geo/dal/queries";
import { getPendingPricingStaffRequestForClient } from "@/features/requests/server/staff-request";
import { NewStaffRequestForm } from "./_form";
import { getSession } from "@/lib/session";

export default async function NewStaffRequestPage() {
    const session = await getSession();
    if (!session) redirect("/sign-in");

    const t = await getTranslations("staffRequest.newPage");
    const tWizard = await getTranslations("staffRequest.wizard");

    const initialLocation = (await getAddressLocation()) ?? null;
    const pendingDraft = await getPendingPricingStaffRequestForClient(session.userId);
    const existingDraft = pendingDraft
        ? {
              id: pendingDraft.id,
              start_date: pendingDraft.start_date,
              end_date: pendingDraft.end_date,
              positions: pendingDraft.positions,
              daily_time_windows: pendingDraft.daily_time_windows ?? [],
          }
        : null;

    return (
        <div className="w-full max-w-3xl space-y-6">
            <BackLink backHref="/client" title={t("backTitle")} />
            <header className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    {tWizard("step1Title")}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {tWizard("step1Description")}
                </p>
            </header>

            <NewStaffRequestForm
                initialLocation={initialLocation}
                existingDraft={existingDraft}
            />
        </div>
    );
}
