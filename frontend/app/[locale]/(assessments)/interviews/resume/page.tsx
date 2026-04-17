import { Loader2Icon } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchAccessToken } from "hume";
import { env } from "@/data/env/server";
import { getSession } from "@/lib/session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { ResumeInterviewClient } from "./_resume-interview-client";

export default async function ResumeInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Loader2Icon className="size-24 animate-spin" />
        </div>
      }
    >
      <SuspendedContent />
    </Suspense>
  );
}

async function SuspendedContent() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "worker") redirect("/worker");

  const [worker, { authUser }] = await Promise.all([
    getWorkerProfile(),
    getCurrentUser({ allData: true }),
  ]);

  if (!worker) redirect("/onboarding/profile");

  const existing = await getInterviewBySubjectForUser(
    "resume",
    session.userId,
  );
  if (existing && isAssessmentInterviewLocked(existing)) {
    redirect("/worker/assessments");
  }

  const accessToken = await fetchAccessToken({
    apiKey: env.HUME_API_KEY,
    secretKey: env.HUME_SECRET_KEY,
  });

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
    authUser?.displayName ||
    "Candidate";

  return (
    <ResumeInterviewClient
      accessToken={accessToken}
      userName={userName}
      userImage={authUser?.photoURL ?? ""}
      profession={worker.profession ?? "Healthcare Professional"}
      years_exp={worker.years_exp?.toString() ?? "0"}
    />
  );
}
