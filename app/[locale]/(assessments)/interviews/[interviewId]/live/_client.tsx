"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { InterviewShell } from "../../_components/interview-shell";
import type { InterviewRow } from "@/features/interviews/dal/queries";
import type { InterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";

function parseDurationToSeconds(ts: string | null | undefined): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function LiveClient({
  accessToken,
  interview,
  subjectRef,
  sessionVariables,
  user,
  title,
  description,
  returnPath,
  allowedLocales,
  durationSecs,
  initialSelectedLocale,
}: {
  accessToken: string;
  interview: InterviewRow;
  subjectRef: InterviewSubjectRef;
  sessionVariables: Record<string, string>;
  user: { name: string; imageUrl: string };
  title: string;
  description: string;
  returnPath: string;
  allowedLocales?: string[];
  durationSecs?: number;
  initialSelectedLocale?: string;
}) {
  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        interviewId={interview.id}
        chatGroupId={interview.chat_group_id ?? undefined}
        savedDurationSecs={parseDurationToSeconds(interview.duration)}
        subjectRef={subjectRef}
        title={title}
        description={description}
        sessionVariables={sessionVariables}
        user={user}
        returnPath={returnPath}
        savedLocale={interview.language ?? undefined}
        durationSecs={durationSecs}
        allowedLocales={allowedLocales}
        autoStart
        initialSelectedLocale={initialSelectedLocale}
      />
    </VoiceProvider>
  );
}

