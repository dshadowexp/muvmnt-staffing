import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import { getScreeningById } from "@/features/screenings/dal/queries";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { EditScreeningForm } from "./_form";

export default async function ScreeningEditPage({
  params,
}: {
  params: Promise<{ screeningId: string }>;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Suspense fallback={<EditPageSkeleton />}>
        <EditPageContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditPageContent({
  params,
}: {
  params: Promise<{ screeningId: string }>;
}) {
  const { screeningId } = await params;
  const locale = await getLocale();

  const facility = await getFacilityProfile();
  if (!facility) return redirect({ href: "/app", locale });

  const screening = await getScreeningById(screeningId, facility.id);
  if (!screening) return redirect({ href: "/app/screenings", locale });

  // Only allow edits when the screening is active
  if (screening.status !== "active") {
    return redirect({ href: `/app/screenings/${screeningId}`, locale });
  }

  return (
    <>
      <BackLink
        backHref={`/app/screenings/${screeningId}`}
        title={screening.title}
      />
      <h1 className="text-lg font-semibold tracking-tight">Edit screening</h1>
      <EditScreeningForm screening={screening} />
    </>
  );
}

function EditPageSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-40" />
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-36 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
    </>
  );
}
