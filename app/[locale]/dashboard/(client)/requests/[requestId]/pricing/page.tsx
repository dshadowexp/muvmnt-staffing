import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import {
    buildPricingQuoteForRequest,
    getStaffRequestRow,
} from "@/features/requests/server/staff-request";
import { STAFF_REQUEST_STATUS_CONFIRMED } from "@/features/requests/constants";
import { PricingTierPicker } from "@/features/requests/components/pricing-tier-picker";
import { StaffRequestLocationCard } from "@/features/requests/components/staff-request-location-card";
import { StaffRequestScheduleSummaryCard } from "@/features/requests/components/staff-request-schedule-summary-card";

type PageProps = {
    params: Promise<{ requestId: string; locale: string }>;
};

export default async function PricingStepPage({ params }: PageProps) {
    const locale = await getLocale();
    const { requestId } = await params;

    const t = await getTranslations("staffRequest.wizard");

    const result = await getStaffRequestRow(requestId);
    if (!result.ok) {
        if (result.message === "Unauthenticated") {
            return redirect({ href: "/sign-in?redirect=/dashboard/requests/${requestId}/pricing", locale });
        }
        if (result.message === "Unauthorized") {
            return redirect({ href: "/dashboard", locale });
        }
        return redirect({ href: "/dashboard/requests/new", locale });
    }

    const { data } = result;
    if (!data) {
        return redirect({ href: "/dashboard/requests/new", locale });
    }
    if (data.status === STAFF_REQUEST_STATUS_CONFIRMED) {
        return redirect({ href: `/dashboard/requests/${requestId}`, locale });
    }

    return (
        <div className="w-full max-w-3xl space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    {t("step2Title")}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {t("step2Description")}
                </p>
                <div className="text-muted-foreground space-y-1 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                    <p>{t("step2BaseRateNotice")}</p>
                </div>
            </header>

            <Suspense
                fallback={
                    <Skeleton className="h-[3.25rem] w-full rounded-xl" />
                }
            >
                <StaffRequestLocationCard />
            </Suspense>

            <StaffRequestScheduleSummaryCard
                positions={data.positions}
                startDate={data.start_date}
                endDate={data.end_date}
                dailyWindows={data.daily_time_windows ?? []}
                profession={data.profession}
                tasks={data.tasks ?? []}
                requirements={data.requirements ?? []}
            />

            <Suspense fallback={<PricingTierSkeleton />}>
                <PricingTiersAsync requestId={requestId} />
            </Suspense>
        </div>
    );
}

async function PricingTiersAsync({ requestId }: { requestId: string }) {
    const result = await buildPricingQuoteForRequest({ requestId });
    if (!result.ok) {
        return (
            <p className="text-muted-foreground text-sm">{result.message}</p>
        );
    }
    return <PricingTierPicker requestId={requestId} quote={result.quote} />;
}

function PricingTierSkeleton() {
    return (
        <div
            className="grid w-full gap-3 sm:grid-cols-2"
            aria-busy="true"
        >
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5"
                >
                    <div className="flex items-start gap-3">
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-40" />
                        </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="mt-auto flex items-baseline gap-2">
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="ml-auto h-5 w-12" />
                    </div>
                </div>
            ))}
        </div>
    );
}
