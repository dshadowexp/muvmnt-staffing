import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { fetchAccessToken } from "hume";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/data/env/server";
import { getSession } from "@/lib/session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import { resolveWorkerPhotoSrc } from "@/features/shifts/lib/resolve-worker-photo-url";
import { ResumeInterviewClient } from "./_resume-interview-client";
import { redirect } from "@/i18n/navigation";

export default async function ResumeInterviewPage() {
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

  const existing = await getInterviewBySubjectForUser(
    "resume",
    session.userId,
  );
  if (existing && isAssessmentInterviewLocked(existing)) {
    return redirect({ href: `/interviews/${existing.id}`, locale });
  }

  const [accessToken, photoSrc] = await Promise.all([
    fetchAccessToken({
      apiKey: env.HUME_API_KEY,
      secretKey: env.HUME_SECRET_KEY,
    }),
    resolveWorkerPhotoSrc(worker.photo_url),
  ]);

  const t = await getTranslations("assessments.interview");

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
    t("candidateFallback");

  return (
    <ResumeInterviewClient
      accessToken={accessToken}
      userName={userName}
      userImage={photoSrc ?? ""}
      profession={worker.profession ?? t("profession.fallbackProfession")}
      years_exp={worker.years_exp?.toString() ?? "0"}
      existingInterview={existing}
    />
  );
}
