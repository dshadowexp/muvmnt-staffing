"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { InterviewRow } from "@/features/interviews/dal/queries";
import { ResumeUpload } from "./_resume-upload";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import { Badge } from "@/components/ui/badge";

export function ResumeStepClient({
  interviewId,
  title,
  subtitle,
  userName,
  photoUrl,
  existingInterview,
  backHref,
  interviewTitle,
  interviewDescription,
  defaultProfessionContext,
  allowedLocales,
}: {
  interviewId: string;
  title: string;
  subtitle: string;
  userName: string;
  photoUrl: string | null;
  existingInterview: InterviewRow;
  backHref: string;
  interviewTitle?: string;
  interviewDescription?: string;
  defaultProfessionContext?: string;
  allowedLocales: string[];
}) {
  const router = useRouter();
  const t = useTranslations("assessments.interview.resumeStep");

  const hasResume = useMemo(() => {
    const ref = parseInterviewSubjectRef(existingInterview.subject_ref);
    return ref.resumeUrl.trim().length > 0;
  }, [existingInterview.subject_ref]);

  useEffect(() => {
    // If resume is already present (e.g. returning), move them forward.
    if (hasResume) {
      router.replace(`/interviews/${interviewId}/setup`);
    }
  }, [hasResume, interviewId, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-6 md:pt-8">
      <div className="mb-8 text-center">
        <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
          {t("badge")}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          {subtitle}
        </p>
      </div>

      <ResumeUpload
        existingInterview={existingInterview}
        candidateName={userName}
        backHref={backHref}
        layout="embedded"
        onResumeReady={() => {
          router.push(`/interviews/${interviewId}/setup`);
        }}
        professionLabel={undefined}
        professionContext={defaultProfessionContext}
      />
    </div>
  );
}

