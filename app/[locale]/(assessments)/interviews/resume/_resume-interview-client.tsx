"use client";

import { useState } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import { useLocale, useTranslations } from "next-intl";
import { InterviewShell } from "../_components/interview-shell";
import { ResumeUpload } from "./_resume-upload";
import type { InterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import type { InterviewRow } from "@/features/interviews/dal/queries";

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

  if (!ready) {
    return (
      <ResumeUpload
        existingInterview={existingInterview}
        onResumeReady={setReady}
      />
    );
  }

  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        subject="resume"
        interviewId={existingInterview?.id ?? undefined}
        subjectRef={{
          key: ready.ref.key,
          body: ready.ref.body.slice(0, 4000),
          limit: ready.ref.limit,
        }}
        title={t("interviewTitle")}
        description={t("interviewDescription")}
        sessionVariables={{
          language: locale,
          candidate_name: userName,
          resume_text: ready.ref.body,
          profession: profession,
          years_of_experience: years_exp,
        }}
        user={{ name: userName, imageUrl: userImage }}
        returnPath="/dashboard/assessments"
      />
    </VoiceProvider>
  );
}
