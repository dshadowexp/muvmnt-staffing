import { Suspense } from "react";
import { CircleDashedIcon } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import { getScreeningById, getCandidatesForScreening } from "@/features/screenings/dal/queries";
import { resolveWorkerPhotoSrc } from "@/features/shifts/lib/resolve-worker-photo-url";
import { redirect } from "@/i18n/navigation";
import { EvaluateClient } from "./_client";

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ screeningId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh items-center justify-center">
          <CircleDashedIcon className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EvaluateContent params={params} />
    </Suspense>
  );
}

async function EvaluateContent({
  params,
}: {
  params: Promise<{ screeningId: string }>;
}) {
  const { screeningId } = await params;
  const locale = await getLocale();

  const facility = await getFacilityProfile();
  if (!facility) return redirect({ href: "/dashboard", locale });

  const [screening, candidates] = await Promise.all([
    getScreeningById(screeningId, facility.id),
    getCandidatesForScreening(screeningId),
  ]);

  if (!screening) return redirect({ href: "/dashboard/screenings", locale });
  if (candidates.length === 0) {
    return redirect({ href: `/dashboard/screenings/${screeningId}`, locale });
  }

  // Resolve S3 keys → presigned URLs for all candidate photos in parallel
  const resolvedPhotos = await Promise.all(
    candidates.map((c) => resolveWorkerPhotoSrc(c.photo_url))
  );
  const candidatesWithPhotos = candidates.map((c, i) => ({
    ...c,
    photo_url: resolvedPhotos[i] ?? null,
  }));

  return (
    <EvaluateClient
      screening={screening}
      candidates={candidatesWithPhotos}
    />
  );
}
