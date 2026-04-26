"use client";

import { useState } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import { useLocale, useTranslations } from "next-intl";
import { InterviewShell } from "../_components/interview-shell";
import { ResumeUpload } from "./_resume-upload";
import { PhotoUploadStep } from "./_photo-upload";
import type { SavePhotoResult } from "./_photo-upload";
import { INTERVIEW_DURATION_SECS } from "@/lib/constants";
import type { InterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import type { InterviewRow } from "@/features/interviews/dal/queries";
import { professionLabelEn } from "@/lib/labels-en";
import { normalizeProfessionId } from "@/lib/professions";
import { getProfessionContext } from "@/services/ai/interviews/profession-context";

function parseDurationToSeconds(ts: string | null | undefined): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

type ReadyState = {
  interviewId: string;
  ref: InterviewSubjectRef;
};

type Props = {
  accessToken: string;
  userName: string;
  photoUrl: string | null;
  profession: string;
  years_exp: string;
  existingInterview: InterviewRow | null;
  /**
   * Where the back-link in the header points and where the shell falls back to
   * on error. Defaults to "/dashboard" (worker flow).
   */
  returnPath?: string;
  /**
   * Persists the photo S3 key. Injected by the server page so workers and
   * candidates use different server actions without changing this component.
   */
  onSavePhoto: (key: string) => Promise<SavePhotoResult>;
  /** Override the shell title (defaults to the i18n "interviewTitle" string). */
  interviewTitle?: string;
  /** Override the shell description. */
  interviewDescription?: string;
  /** Fallback profession context used in session variables before a resume is uploaded. */
  defaultProfessionContext?: string;
};

export function ResumeInterviewClient({
  accessToken,
  userName,
  photoUrl,
  profession,
  years_exp,
  existingInterview,
  returnPath = "/dashboard",
  onSavePhoto,
  interviewTitle,
  interviewDescription,
  defaultProfessionContext,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("assessments.interview.resume");
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [userImage, setUserImage] = useState("");

  const professionKey = normalizeProfessionId(profession);
  const computedContext = getProfessionContext(professionKey);

  if (!photoReady) {
    return (
      <PhotoUploadStep
        initialPhotoKey={photoUrl ?? undefined}
        backHref={returnPath}
        onSavePhoto={onSavePhoto}
        onComplete={(url) => {
          setUserImage(url);
          setPhotoReady(true);
        }}
      />
    );
  }

  if (!ready) {
    return (
      <ResumeUpload
        existingInterview={existingInterview}
        candidateName={userName}
        onResumeReady={setReady}
        onBack={() => setPhotoReady(false)}
      />
    );
  }

  const title = interviewTitle ?? t("interviewTitle");
  const description =
    interviewDescription ??
    t("interviewDescription", { minutes: INTERVIEW_DURATION_SECS / 60 });
  const professionContext =
    ready.ref.professionContext ||
    defaultProfessionContext ||
    computedContext;

  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        subject="combined"
        interviewId={ready.interviewId}
        chatGroupId={existingInterview?.chat_group_id ?? undefined}
        savedDurationSecs={parseDurationToSeconds(existingInterview?.duration)}
        subjectRef={{
          resumeUrl:         ready.ref.resumeUrl,
          resumeSummary:     ready.ref.resumeSummary.slice(0, 4000),
          uploadCount:       ready.ref.uploadCount,
          profession:        ready.ref.profession,
          professionContext,
        }}
        title={title}
        description={description}
        sessionVariables={{
          language:           locale,
          candidate_name:     userName,
          resume_text:        ready.ref.resumeSummary,
          years_of_experience: years_exp,
          profession:         ready.ref.profession || professionLabelEn(professionKey),
          profession_context: professionContext,
        }}
        user={{ name: userName, imageUrl: userImage }}
        returnPath={returnPath}
      />
    </VoiceProvider>
  );
}
