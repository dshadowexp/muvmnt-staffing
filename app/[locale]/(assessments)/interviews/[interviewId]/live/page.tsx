import { Suspense } from "react";
import { CircleDashedIcon } from "lucide-react";
import { fetchAccessToken } from "hume";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { env } from "@/data/env/server";
import { getSession } from "@/lib/get-session";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getScreeningCandidate } from "@/features/screenings/dal/queries";
import { createAdminClient } from "@/supabase/server";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import { professionLabelEn } from "@/lib/labels-en";
import { normalizeProfessionId } from "@/lib/professions";
import { getProfessionContext } from "@/services/ai/interviews/profession-context";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";
import { LiveClient } from "./_client";
import { CANDIDATE_ROLE, STAFF_ROLE } from "@/features/auth/types";

export default async function InterviewLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ interviewId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin" />
        </div>
      }
    >
      <SuspendedContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SuspendedContent({
  params,
  searchParams,
}: {
  params: Promise<{ interviewId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { interviewId } = await params;
  const sp = await searchParams;
  const locale = await getLocale();

  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  if (session.role !== STAFF_ROLE && session.role !== CANDIDATE_ROLE) {
    return redirect({ href: "/staff", locale });
  }

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (!interview) return redirect({ href: "/staff", locale });

  // Hume access token for voice session.
  const accessToken = await fetchAccessToken({
    apiKey: env.HUME_API_KEY,
    secretKey: env.HUME_SECRET_KEY,
  });

  const subjectRef = parseInterviewSubjectRef(interview.subject_ref);

  // Determine allowed locales + duration/title/description for screening interviews.
  let allowedLocales: string[] | undefined;
  let durationSecs: number | undefined;
  let title: string;
  let description: string;

  const tResume = await getTranslations("assessments.interview.resume");
  title = tResume("interviewTitle");
  description = tResume("interviewDescription", { minutes: 15 });

  if (interview.screening_id) {
    const supabase = await createAdminClient();
    const { data: screening } = await supabase
      .from("screenings")
      .select("title, description, interview_duration, allowed_languages")
      .eq("id", interview.screening_id)
      .maybeSingle();
    if (screening?.title) title = screening.title;
    if (screening?.description) description = screening.description;
    if (screening?.allowed_languages) allowedLocales = screening.allowed_languages;
    if (screening?.interview_duration) durationSecs = screening.interview_duration * 60;
  }

  // Resolve display name + photo URL for chat UI.
  let userName = "Candidate";
  let yearsExp = "0";
  let profession = "healthcare";
  let photoUrl: string | null = null;

  if (session.role === "candidate") {
    if (!interview.screening_id) return redirect({ href: "/staff", locale });
    const candidate = await getScreeningCandidate(session.userId, interview.screening_id);
    userName =
      [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") ||
      tResume("candidateFallback");

    if (candidate?.photo_url) {
      try {
        photoUrl = (await getPresignedDownloadUrl(candidate.photo_url)).url;
      } catch {
        photoUrl = null;
      }
    }
  } else {
    const worker = await getWorkerProfile();
    if (!worker) return redirect({ href: "/staff", locale });
    userName =
      [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
      tResume("candidateFallback");
    yearsExp = worker.years_exp?.toString() ?? "0";
    profession = worker.profession ?? "healthcare";

    if (worker.photo_url) {
      try {
        photoUrl = (await getPresignedDownloadUrl(worker.photo_url)).url;
      } catch {
        photoUrl = null;
      }
    }
  }

  const professionKey = normalizeProfessionId(profession);
  const computedContext = getProfessionContext(professionKey);
  const professionContext =
    subjectRef.professionContext || computedContext;

  const langParam = typeof sp.lang === "string" ? sp.lang : undefined;

  return (
    <LiveClient
      accessToken={accessToken}
      interview={interview}
      subjectRef={{
        resumeUrl: subjectRef.resumeUrl,
        resumeSummary: subjectRef.resumeSummary.slice(0, 4000),
        uploadCount: subjectRef.uploadCount,
        profession: subjectRef.profession,
        professionContext,
      }}
      sessionVariables={{
        language: locale,
        candidate_name: userName,
        resume_text: subjectRef.resumeSummary,
        years_of_experience: yearsExp,
        profession: subjectRef.profession || professionLabelEn(professionKey),
        profession_context: professionContext,
      }}
      user={{ name: userName, imageUrl: photoUrl ?? "" }}
      title={title}
      description={description}
      returnPath={session.role === "candidate" && interview.screening_id ? `/s/${interview.screening_id}` : "/dashboard"}
      allowedLocales={allowedLocales}
      durationSecs={durationSecs}
      initialSelectedLocale={langParam}
    />
  );
}

