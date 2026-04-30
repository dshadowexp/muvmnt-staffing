import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import { redirect } from "@/i18n/navigation";
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import { saveCandidatePhotoAction } from "@/features/screenings/candidate-actions";
import { getScreeningCandidate } from "@/features/screenings/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { InterviewStepsClient } from "./_steps-client";

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

    // Fetch screening for title / description / settings
    const { data: screening } = await supabase
      .from("screenings")
      .select("title, description")
      .eq("id", screening_id)
      .maybeSingle();

    const t = await getTranslations("assessments.interview");
    const candidateName =
      [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") ||
      t("candidateFallback");

    const onSavePhoto = saveCandidatePhotoAction.bind(null, screening_id);

    // Fetch full screening settings (title/description already fetched above)
    const { data: screeningSettings } = await supabase
      .from("screenings")
      .select("interview_duration, allowed_languages")
      .eq("id", screening_id)
      .maybeSingle();

    return (
      <InterviewStepsClient
        interviewId={interview.id}
        role="candidate"
        userName={candidateName}
        backHref={`/s/${screening_id}`}
        title={screening?.title ?? t("hub.defaultTitle")}
        subtitle={screening?.description ?? t("hub.defaultSubtitle")}
        screeningDetails={{
          title: screening?.title ?? t("hub.defaultTitle"),
          description: screening?.description ?? null,
          durationMins: screeningSettings?.interview_duration ?? 15,
          allowedLocales: screeningSettings?.allowed_languages ?? ["en"],
        }}
        hasPhoto={Boolean(candidate.photo_url)}
        hasResume={Boolean((interview.subject_ref as unknown as { resumeUrl?: string })?.resumeUrl)}
        interviewCompleted={Boolean(interview.completed_at)}
        onSavePhoto={onSavePhoto}
        durationMins={screeningSettings?.interview_duration ?? 15}
        allowedLocales={screeningSettings?.allowed_languages ?? ["en"]}
        savedLocale={interview.language ?? undefined}
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

  const t = await getTranslations("assessments.interview");

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
    t("candidateFallback");

  return (
    <InterviewStepsClient
      interviewId={interview.id}
      role="worker"
      userName={userName}
      backHref="/dashboard"
      title={t("hub.defaultTitle")}
      subtitle={t("hub.defaultSubtitle")}
      hasPhoto={Boolean(worker.photo_url)}
      hasResume={Boolean((interview.subject_ref as unknown as { resumeUrl?: string })?.resumeUrl)}
      interviewCompleted={Boolean(interview.completed_at)}
      onSavePhoto={updateWorkerPhotoAction}
      durationMins={15}
      allowedLocales={["en", "fr"]}
      savedLocale={interview.language ?? undefined}
    />
  );
}
