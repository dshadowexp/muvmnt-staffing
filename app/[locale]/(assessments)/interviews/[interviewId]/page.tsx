import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { fetchAccessToken } from "hume";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/data/env/server";
import { getSession } from "@/lib/session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import { redirect } from "@/i18n/navigation";
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import { saveCandidatePhotoAction } from "@/features/screenings/candidate-actions";
import { getScreeningCandidate } from "@/features/screenings/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { ResumeInterviewClient } from "./_client";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin" />
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

  // ── Candidate flow ──────────────────────────────────────────────────────────
  if (session.role === "candidate") {
    const interview = await getInterviewByIdForUser(interviewId, session.userId);
    if (!interview?.screening_id) return redirect({ href: "/", locale });

    const { screening_id } = interview;

    const [candidate, supabase] = await Promise.all([
      getScreeningCandidate(session.userId, screening_id),
      createAdminClient(),
    ]);

    // Completed — return them to the screening portal
    if (!candidate || candidate.stage === "completed") {
      return redirect({ href: `/s/${screening_id}`, locale });
    }

    // Fetch screening for title / description
    const { data: screening } = await supabase
      .from("screenings")
      .select("title, description")
      .eq("id", screening_id)
      .maybeSingle();

    const accessToken = await fetchAccessToken({
      apiKey: env.HUME_API_KEY,
      secretKey: env.HUME_SECRET_KEY,
    });

    const t = await getTranslations("assessments.interview");
    const candidateName =
      [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") ||
      t("candidateFallback");

    const onSavePhoto = saveCandidatePhotoAction.bind(null, screening_id);

    return (
      <ResumeInterviewClient
        accessToken={accessToken}
        userName={candidateName}
        photoUrl={candidate.photo_url ?? null}
        profession="healthcare"
        years_exp="0"
        existingInterview={interview}
        returnPath={`/s/${screening_id}`}
        onSavePhoto={onSavePhoto}
        interviewTitle={screening?.title}
        interviewDescription={screening?.description ?? undefined}
        defaultProfessionContext={screening?.description ?? undefined}
      />
    );
  }

  // ── Worker flow ─────────────────────────────────────────────────────────────
  if (session.role !== "worker") return redirect({ href: "/dashboard", locale });

  const [interview, worker] = await Promise.all([
    getInterviewByIdForUser(interviewId, session.userId),
    getWorkerProfile(),
  ]);

  // Not found, wrong owner, or worker profile missing
  if (!interview || !worker) return redirect({ href: "/dashboard", locale });

  // Locked (passed, or failed and still in retry window) — nothing to do here
  if (isAssessmentInterviewLocked(interview)) {
    return redirect({ href: "/dashboard", locale });
  }

  const accessToken = await fetchAccessToken({
    apiKey: env.HUME_API_KEY,
    secretKey: env.HUME_SECRET_KEY,
  });

  const t = await getTranslations("assessments.interview");

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
    t("candidateFallback");

  return (
    <ResumeInterviewClient
      accessToken={accessToken}
      userName={userName}
      photoUrl={worker.photo_url ?? null}
      profession={worker.profession ?? t("profession.fallbackProfession")}
      years_exp={worker.years_exp?.toString() ?? "0"}
      existingInterview={interview}
      returnPath="/dashboard"
      onSavePhoto={updateWorkerPhotoAction}
    />
  );
}
