import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
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
import { StaffRequestScheduleSummaryCard } from "@/features/requests/components/staff-request-schedule-summary-card";
import { getBillingAccount } from "@/features/payments/billing/dal/queries";
import { getSession } from "@/lib/session";

type PageProps = {
    params: Promise<{ requestId: string; locale: string }>;
};

/**
 * Step 3 of the staff-request wizard.
 *
 * Render path:
 *   1. Auth + ownership; redirect back if the request isn't ours.
 *   2. If status is `pending_pricing`, send the user back to step 2.
 *   3. If `coverage_data` exists and is younger than 30 minutes → render the
 *      cached coverage + confirm CTA immediately.
 *   4. Otherwise → fire a Trigger.dev `match-coverage` run, mint a public
 *      access token for `useRealtimeRun`, and stream progress until the run
 *      finishes (then `router.refresh()` re-enters branch (3)).
 */
export default async function CoverageStepPage({ params }: PageProps) {
    const { requestId } = await params;
    const session = await getSession();
    if (!session) redirect("/sign-in");

    const t = await getTranslations("staffRequest.wizard");

    const result = await getStaffRequestRow(requestId, session.userId);
    if (!result.ok) redirect("/dashboard/requests/new");
    const row = result.row;

    if (row.status === STAFF_REQUEST_STATUS_CONFIRMED) {
        redirect(`/dashboard/requests/${requestId}`);
    }
    if (row.status === STAFF_REQUEST_STATUS_PENDING_PRICING) {
        redirect(`/dashboard/requests/${requestId}/pricing`);
    }

    return (
        <div className="w-full max-w-3xl space-y-6">
            <BackLink
                backHref={`/dashboard/requests/${requestId}/pricing`}
                title={t("backToPricing")}
            />
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

            <StaffRequestScheduleSummaryCard
                positions={row.positions}
                startDate={row.start_date}
                endDate={row.end_date}
                dailyWindows={row.daily_time_windows ?? []}
            />

            {row.pricing_tier ? (
                <SelectedPricingTierCard
                    tierId={row.pricing_tier}
                    hourlyRate={row.pricing_rate ?? 0}
                    currency="CAD"
                />
            ) : null}

            <Suspense fallback={<CoverageBodySkeleton />}>
                <CoverageBody row={row} requestId={requestId} />
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
        const billing = await getBillingAccount();
        const account = "data" in billing ? billing.data : null;
        const hasSavedPaymentMethod = !!(
            account?.customerId && account?.defaultPaymentMethodId
        );

        return (
            <CoverageConfirmPanel
                requestId={requestId}
                cache={cache}
                hasSavedPaymentMethod={hasSavedPaymentMethod}
                cachedAtIso={row.coverage_data_at}
                fullSchedule={{
                    startIso: row.start_date,
                    endIso: row.end_date,
                    positions: row.positions,
                    dailyWindows: row.daily_time_windows ?? [],
                }}
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
