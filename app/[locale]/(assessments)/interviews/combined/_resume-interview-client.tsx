"use client";

import { useState } from "react";
import { VoiceProvider } from "@humeai/voice-react";

function parseDurationToSeconds(ts: string | null | undefined): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
import { useLocale, useTranslations } from "next-intl";
import { InterviewShell } from "../_components/interview-shell";
import { ResumeUpload } from "./_resume-upload";
import { INTERVIEW_DURATION_SECS } from "@/lib/constants";
import type { InterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import type { InterviewRow } from "@/features/interviews/dal/queries";
import { professionLabelEn } from "@/lib/labels-en";
import { normalizeProfessionId } from "@/lib/professions";
import { getProfessionContext } from "@/services/ai/interviews/profession-context";

type Props = {
  accessToken: string;
  userName: string;
  userImage: string;
  profession: string;
  years_exp: string;
  existingInterview: InterviewRow | null;
};

type ReadyState = {
  interviewId: string;
  ref: InterviewSubjectRef;
};

export function ResumeInterviewClient({
  accessToken,
  userName,
  userImage,
  profession,
  years_exp,
  existingInterview,
}: Props) {
  const t = useTranslations("assessments.interview.resume");
  const locale = useLocale();
  const [ready, setReady] = useState<ReadyState | null>(null);
  const professionKey = normalizeProfessionId(profession);
  const context = getProfessionContext(professionKey);

  if (!ready) {
    return (
      <ResumeUpload
        existingInterview={existingInterview}
        candidateName={userName}
        onResumeReady={setReady}
      />
    );
  }

  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        subject={`combined`}
        interviewId={ready.interviewId}
        chatGroupId={existingInterview?.chat_group_id ?? undefined}
        savedDurationSecs={parseDurationToSeconds(existingInterview?.duration)}
        subjectRef={{
          key: ready.ref.key,
          body: ready.ref.body.slice(0, 4000),
          limit: ready.ref.limit,
        }}
        title={t("interviewTitle")}
        description={t("interviewDescription", {
          minutes: INTERVIEW_DURATION_SECS / 60,
        })}
        sessionVariables={{
          language: locale,
          candidate_name: userName,
          resume_text: ready.ref.body,
          years_of_experience: years_exp,
          profession: professionLabelEn(professionKey),
          profession_context: context,
        }}
        user={{ name: userName, imageUrl: userImage }}
        returnPath="/dashboard/assessments"
      />
    </VoiceProvider>
  );
}
