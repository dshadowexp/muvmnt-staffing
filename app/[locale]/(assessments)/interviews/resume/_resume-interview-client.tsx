"use client";

import { useState } from "react";
import { VoiceProvider } from "@humeai/voice-react";
import { InterviewShell } from "../_components/interview-shell";
import { ResumeUpload } from "./_resume-upload";

type Props = {
  accessToken: string;
  userName: string;
  userImage: string;
  profession: string;
  years_exp: string;
};

export function ResumeInterviewClient({
  accessToken,
  userName,
  userImage,
  profession,
  years_exp,
}: Props) {
  const [resumeSummary, setResumeSummary] = useState<string | null>(null);

  if (!resumeSummary) {
    return <ResumeUpload onResumeReady={setResumeSummary} />;
  }

  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        subject="resume"
        subjectRef={resumeSummary.slice(0, 2000)}
        title="Resume Behavioural Interview"
        description="A 10-minute AI-led behavioural interview based on your resume. You will be asked situational and experience-based questions using the STAR method."
        sessionVariables={{
          candidate_name: userName,
          resume_text: resumeSummary,
          profession: profession,
          years_of_experience: years_exp,
        }}
        user={{ name: userName, imageUrl: userImage }}
        returnPath="/worker/assessments"
      />
    </VoiceProvider>
  );
}
