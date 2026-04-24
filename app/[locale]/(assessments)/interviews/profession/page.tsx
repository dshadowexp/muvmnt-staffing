import { CircleDashedIcon } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { fetchAccessToken } from "hume";
import { VoiceProvider } from "@humeai/voice-react";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/data/env/server";
import { getSession } from "@/lib/session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getProfessionContext } from "@/services/ai/profession-context";
import { professionLabelEn } from "@/lib/labels-en";
import { normalizeProfessionId } from "@/lib/professions";
import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import { resolveWorkerPhotoSrc } from "@/features/shifts/lib/resolve-worker-photo-url";
import { INTERVIEW_DURATION_SECS } from "@/lib/constants";
import { InterviewShell } from "../_components/interview-shell";

function parseDurationToSeconds(ts: string | null | undefined): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export default async function ProfessionInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin" />
        </div>
      }
    >
      <SuspendedContent />
    </Suspense>
  );
}

async function SuspendedContent() {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  if (session.role !== "worker") return redirect({ href: `/dashboard`, locale });

  const worker = await getWorkerProfile();

  if (!worker) return redirect({ href: "/onboarding/profile", locale });

  // Guard: a profile photo is required before the interview can start.
  if (!worker.photo_url) return redirect({ href: "/dashboard/profile", locale });

  const existing = await getInterviewBySubjectForUser(
    "profession",
    session.userId,
  );
  if (existing && isAssessmentInterviewLocked(existing)) {
    return redirect({ href: `/interviews/${existing.id}`, locale });
  }

  const professionKey = normalizeProfessionId(worker.profession);
  const context = getProfessionContext(professionKey);

  const [accessToken, photoSrc] = await Promise.all([
    fetchAccessToken({
      apiKey: env.HUME_API_KEY,
      secretKey: env.HUME_SECRET_KEY,
    }),
    resolveWorkerPhotoSrc(worker.photo_url),
  ]);

  const t = await getTranslations("assessments.interview");
  const tProf = await getTranslations({ locale, namespace: "professions" });
  const professionLabel = tProf(professionKey);

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
    t("candidateFallback");

  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        interviewId={existing?.id ?? undefined}
        chatGroupId={existing?.chat_group_id ?? undefined}
        savedDurationSecs={parseDurationToSeconds(existing?.duration)}
        subject="profession"
        subjectRef={{ key: professionKey, body: context, limit: 0 }}
        title={t("profession.title", { profession: professionLabel })}
        description={t("profession.description", {
          profession: professionLabel,
          minutes: INTERVIEW_DURATION_SECS / 60,
        })}
        sessionVariables={{
          language: locale,
          candidate_name: userName,
          profession: professionLabelEn(professionKey),
          profession_context: context,
          years_of_experience: worker.years_exp?.toString() ?? "0",
        }}
        user={{
          name: userName,
          imageUrl: photoSrc ?? "",
        }}
        returnPath="/dashboard/assessments"
      />
    </VoiceProvider>
  );
}
