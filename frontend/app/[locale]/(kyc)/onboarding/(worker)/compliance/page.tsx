import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompliances } from "@/features/profile/dal/queries";
import {
  ComplianceOnboardingClient,
  type ComplianceOnboardingRow,
} from "./_client";

export default async function ComplianceOnboardingPage() {
  const compliancesPromise: Promise<ComplianceOnboardingRow[]> = getCompliances().then(
    (rows) =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        fileUrl: r.file_url,
        isVerified: r.is_verified,
        createdAt: r.created_at,
      })),
  );
  compliancesPromise.catch(() => undefined);

  return (
    <Suspense fallback={<ComplianceOnboardingSkeleton />}>
      <ComplianceOnboardingClient compliancesPromise={compliancesPromise} />
    </Suspense>
  );
}

function ComplianceOnboardingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
