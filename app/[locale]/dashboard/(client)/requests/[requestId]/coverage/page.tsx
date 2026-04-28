import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

import {
    STAFF_REQUEST_STATUS_CONFIRMED,
    STAFF_REQUEST_STATUS_PENDING_PRICING,
} from "@/features/requests/constants";
import {
    dispatchCoverageMatchRun,
    getStaffRequestRow,
    isCoverageFresh,
    type CoverageDataCache,
    type StaffRequestRow,
} from "@/features/requests/server/staff-request";
import { CoverageConfirmPanel } from "@/features/requests/components/coverage-confirm-panel";
import { CoverageMatchTracker } from "@/features/requests/components/coverage-match-tracker";
import { SelectedPricingTierCard } from "@/features/requests/components/selected-pricing-tier-card";
import { StaffRequestLocationCard } from "@/features/requests/components/staff-request-location-card";
import { StaffRequestScheduleSummaryCard } from "@/features/requests/components/staff-request-schedule-summary-card";
import { parseStaffRequestDailyWindows } from "@/features/requests/lib/parse-staff-request-daily-windows";
import { hasPaymentMethod } from "@/features/billing/dal/payment-methods";

type PageProps = {
    params: Promise<{ requestId: string; locale: string }>;
};

export default async function CoverageStepPage({ params }: PageProps) {
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
    if (data.status === STAFF_REQUEST_STATUS_PENDING_PRICING) {
        return redirect({ href: `/dashboard/requests/${requestId}/pricing`, locale });
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-5">
            <header className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    {t("step3Title")}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {t("step3Description")}
                </p>
                <p className="text-muted-foreground rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                    {t("billedWeeklyNotice")}
                </p>
            </header>

            <Suspense
                fallback={
                    <Skeleton className="h-[3.25rem] w-full rounded-xl" />
                }
            >
                <StaffRequestLocationCard requestLocation={data.location} />
            </Suspense>

            <StaffRequestScheduleSummaryCard
                positions={data.positions}
                startDate={data.start_date}
                endDate={data.end_date}
                dailyWindows={parseStaffRequestDailyWindows(
                    data.daily_time_windows,
                )}
                profession={data.profession}
                tasks={data.tasks ?? []}
                requirements={data.requirements ?? []}
            />

            {data.pricing_tier ? (
                <SelectedPricingTierCard
                    tierId={data.pricing_tier}
                    hourlyRate={data.pricing_rate ?? 0}
                    currency="CAD"
                />
            ) : null}

            <Suspense fallback={<CoverageBodySkeleton />}>
                <CoverageBody row={data} requestId={requestId} />
            </Suspense>
        </div>
    );
}

async function CoverageBody({
    row,
    requestId,
}: {
    row: StaffRequestRow;
    requestId: string;
}) {
    const cache = row.coverage_data as CoverageDataCache | null;
    if (cache?.schedule && isCoverageFresh(row.coverage_data_at)) {
        const pmResult = await hasPaymentMethod();
        const hasPaymentMethods =
            "error" in pmResult ? false : (pmResult.data ?? false);

        return (
            <CoverageConfirmPanel
                requestId={requestId}
                cache={cache}
                hasPaymentMethods={hasPaymentMethods}
                cachedAtIso={row.coverage_data_at}
            />
        );
    }

    const dispatched = await dispatchCoverageMatchRun(requestId);
    return (
        <CoverageMatchTracker
            runId={dispatched.runId}
            publicAccessToken={dispatched.publicAccessToken}
        />
    );
}

function CoverageBodySkeleton() {
    return (
        <div
            className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-6"
            aria-busy="true"
        >
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="mt-4 flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
            </div>
        </div>
    );
}
