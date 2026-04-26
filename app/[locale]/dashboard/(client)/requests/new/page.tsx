import { Suspense, cache } from "react";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { getAddressLocation } from "@/features/geo/dal/queries";
import {
    DEFAULT_STAFF_REQUEST_PROFESSION,
    mergePersistedStaffRequestRequirements,
} from "@/features/requests/constants";
import { getPendingPricingStaffRequestForClient } from "@/features/requests/server/staff-request";
import { redirect } from "@/i18n/navigation";
import { normalizeProfessionId } from "@/lib/professions";

import type { ExistingScheduleDraft } from "./_form";
import { NewStaffRequestPageClient } from "./_form";
import { parseStaffRequestDailyWindows } from "@/features/requests/lib/parse-staff-request-daily-windows";

const getPendingStaffRequestDraftCached = cache(getPendingPricingStaffRequestForClient);

function NewStaffRequestPageSkeleton() {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="space-y-6">
                <div className="-ml-1 flex items-center gap-2 py-1.5">
                    <Skeleton className="size-4 shrink-0 rounded" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <header className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-8 max-w-md md:h-9" />
                        <Skeleton className="h-4 w-full max-w-lg" />
                        <Skeleton className="hidden h-4 max-w-md md:block" />
                    </header>
                    <Skeleton className="size-8 shrink-0 rounded-md sm:self-start" />
                </div>
            </div>
            <NewStaffRequestFormSkeleton />
        </div>
    );
}

function NewStaffRequestFormSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-full max-w-md" />
                <Skeleton className="h-36 w-full rounded-xl border border-border" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-28 w-full rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>
        </div>
    );
}

async function NewStaffRequestPageContent() {
    const pendingDraft = await getPendingStaffRequestDraftCached();
    const t = await getTranslations("staffRequest.newPage");
    const tWizard = await getTranslations("staffRequest.wizard");
    if (!pendingDraft.ok) {
        if (pendingDraft.message === "Unauthenticated") {
            redirect({ href: "/sign-in?redirect=/dashboard/requests/new", locale: "en" });
        }
        if (pendingDraft.message === "Unauthorized") {
            redirect({ href: "/dashboard", locale: "en" });
        }
    }

    let initialLocation = null;
    try {
        initialLocation = (await getAddressLocation()) ?? null;
    } catch {
        initialLocation = null;
    }

    let existingDraft: ExistingScheduleDraft | null = null;
    let initialJobProfile = {
        profession: DEFAULT_STAFF_REQUEST_PROFESSION,
        tasks: [] as string[],
        requirements: [] as string[],
    };

    if (pendingDraft.ok) {
        const { data } = pendingDraft;
        existingDraft = {
            id: data.id,
            start_date: data.start_date,
            end_date: data.end_date,
            positions: data.positions,
            daily_time_windows: parseStaffRequestDailyWindows(
                data.daily_time_windows,
            ),
        };
        initialJobProfile = {
            profession: normalizeProfessionId(data.profession),
            tasks: data.tasks ?? [],
            requirements: mergePersistedStaffRequestRequirements(
                data.requirements ?? [],
            ),
        };
    }

    return (
        <NewStaffRequestPageClient
            backTitle={t("backTitle")}
            step1Title={tWizard("step1Title")}
            initialJobProfile={initialJobProfile}
            initialLocation={initialLocation}
            existingDraft={existingDraft}
        />
    );
}

export default function NewStaffRequestPage() {
    return (
        <Suspense fallback={<NewStaffRequestPageSkeleton />}>
            <NewStaffRequestPageContent />
        </Suspense>
    );
}
