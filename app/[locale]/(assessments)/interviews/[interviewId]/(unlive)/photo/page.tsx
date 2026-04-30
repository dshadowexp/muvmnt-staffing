import { Suspense } from "react";
import { CircleDashedIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getScreeningCandidate } from "@/features/screenings/dal/queries";
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import { saveCandidatePhotoAction } from "@/features/screenings/candidate-actions";
import { PhotoStepClient } from "./_client";

export default async function PhotoStepPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SuspendedContent params={params} />
    </Suspense>
  );
}

async function SuspendedContent({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (!interview) return redirect({ href: "/dashboard", locale });

  const t = await getTranslations("assessments.interview.photoStep");

  if (session.role === "candidate") {
    if (!interview.screening_id) return redirect({ href: "/", locale });
    const candidate = await getScreeningCandidate(session.userId, interview.screening_id);
    if (!candidate) return redirect({ href: `/s/${interview.screening_id}`, locale });

    return (
      <PhotoStepClient
        interviewId={interviewId}
        title={t("title")}
        subtitle={t("subtitle")}
        initialPhotoKey={candidate.photo_url ?? undefined}
        backHref={`/interviews/${interviewId}`}
        onSavePhoto={saveCandidatePhotoAction.bind(null, interview.screening_id)}
        nextHref={`/interviews/${interviewId}/resume`}
      />
    );
  }

  if (session.role !== "worker") return redirect({ href: "/dashboard", locale });
  const worker = await getWorkerProfile();
  if (!worker) return redirect({ href: "/dashboard", locale });

  return (
    <PhotoStepClient
      interviewId={interviewId}
      title={t("title")}
      subtitle={t("subtitle")}
      initialPhotoKey={worker.photo_url ?? undefined}
      backHref={`/interviews/${interviewId}`}
      onSavePhoto={updateWorkerPhotoAction}
      nextHref={`/interviews/${interviewId}/resume`}
    />
  );
}

