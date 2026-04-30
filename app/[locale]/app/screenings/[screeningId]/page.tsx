import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import {
  getScreeningById,
  getInvitesForScreening,
  getCandidatesForScreening,
} from "@/features/screenings/dal/queries";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { ScreeningDetailClient } from "./_client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function ScreeningDetailPage({
  params,
}: {
  params: Promise<{ screeningId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ScreeningDetailSkeleton />
      }
    >
      <ScreeningDetail params={params} />
    </Suspense>
  );
}

async function ScreeningDetail({
  params,
}: {
  params: Promise<{ screeningId: string }>;
}) {
  const { screeningId } = await params;
  const locale = await getLocale();

  const facility = await getFacilityProfile();
  if (!facility) return redirect({ href: "/dashboard", locale });

  const screening = await getScreeningById(screeningId, facility.id);
  if (!screening) return redirect({ href: "/dashboard/screenings", locale });

  const [invites, candidates] = await Promise.all([
    getInvitesForScreening(screeningId),
    getCandidatesForScreening(screeningId),
  ]);

  return (
    <ScreeningDetailClient
      screening={screening}
      invites={invites}
      candidates={candidates}
    />
  );
}

function ScreeningDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* BackLink */}
      <Skeleton className="h-4 w-28" />
      {/* Title */}
      <Skeleton className="h-7 w-64" />
      {/* Status row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Description accordion */}
      <div className="rounded-lg border px-3 py-4">
        <Skeleton className="h-4 w-28" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* Stats row (3 cards) */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Action cards (3) */}
      <div className="grid grid-cols-1 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex flex-row items-start justify-between">
            <CardHeader className="flex-grow pb-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-64" />
            </CardHeader>
            <CardContent className="pt-6 pl-0">
              <Skeleton className="h-5 w-5 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
