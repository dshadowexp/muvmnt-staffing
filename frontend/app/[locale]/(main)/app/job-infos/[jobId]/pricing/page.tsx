import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJobInfo } from "@/features/jobs/dal/queries";
import { calculateStaffRequestPricing } from "@/features/jobs/pricing/staff-request-pricing";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { formatJobHourlyRateLine } from "@/lib/formatters";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon, CalculatorIcon } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PricingAcceptForm } from "./pricing-accept-form";

export default async function StaffRequestPricingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const { user } = await getCurrentUser({ allData: true });
  if (user == null) redirect("/sign-in");
  if (user.role === "worker") redirect("/app");

  const { error, data: jobInfo } = await getJobInfo(jobId);
  if (error || jobInfo == null) notFound();
  if (jobInfo.client_id !== user.id) notFound();

  if (jobInfo.hourly_rate != null && jobInfo.hourly_rate > 0) {
    redirect(`/app/job-infos/${jobId}`);
  }

  const pricing = await calculateStaffRequestPricing({
    id: jobInfo.id,
    profession: jobInfo.profession,
    hourly_rate: jobInfo.hourly_rate,
    positions: jobInfo.positions,
    start_date: jobInfo.start_date,
    end_date: jobInfo.end_date,
    start_time: jobInfo.start_time,
    end_time: jobInfo.end_time,
  });

  return (
    <div className="container my-4 max-w-2xl space-y-6">
      <BackLink backHref="/app" title="Staff requests" />

      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Step 2 of 2</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Price calculation
        </h1>
        <p className="text-muted-foreground">
          Your staff request for{" "}
          <span className="font-medium text-foreground">{jobInfo.profession}</span>{" "}
          is saved. Review the estimate, then confirm the hourly rate below. It is
          stored on the request only after you accept.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalculatorIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-lg">Estimate</CardTitle>
          </div>
          <CardDescription>{pricing.statusMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">Hourly rate (on request)</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatJobHourlyRateLine(jobInfo.hourly_rate)}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Projected total</span>
            <span className="text-lg font-semibold tabular-nums text-muted-foreground">
              {pricing.estimatedTotalCents == null
                ? "—"
                : new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: pricing.currency,
                  }).format(pricing.estimatedTotalCents / 100)}
            </span>
          </div>

          <PricingAcceptForm
            jobId={jobId}
            suggestedHourlyRate={pricing.suggestedHourlyRate}
          />

          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link
              href={`/app/job-infos/${jobId}`}
              className="inline-flex items-center gap-2"
            >
              Open staff request
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
