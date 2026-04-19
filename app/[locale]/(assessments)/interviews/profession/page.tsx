import { Loader2Icon } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchAccessToken } from "hume";
import { VoiceProvider } from "@humeai/voice-react";
import { env } from "@/data/env/server";
import { getSession } from "@/lib/session";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getProfessionContext } from "@/services/ai/profession-context";
import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import { InterviewShell } from "../_components/interview-shell";

export default async function ProfessionInterviewPage() {
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

  const worker = await getWorkerProfile();

  if (!worker) redirect("/onboarding/profile");

  const existing = await getInterviewBySubjectForUser(
    "profession",
    session.userId,
  );
  if (existing && isAssessmentInterviewLocked(existing)) {
    redirect("/worker/assessments");
  }

  const profession = worker.profession ?? "Other";
  const context = getProfessionContext(profession);

  const accessToken = await fetchAccessToken({
    apiKey: env.HUME_API_KEY,
    secretKey: env.HUME_SECRET_KEY,
  });

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") ||
    "Candidate";

  return (
    <VoiceProvider>
      <InterviewShell
        accessToken={accessToken}
        subject="profession"
        subjectRef={profession}
        title={`${profession} Professional Interview`}
        description={`A 10-minute AI-led voice interview tailored to your role as a ${profession}. You will be asked questions about your clinical knowledge, experience, and professional competencies.`}
        sessionVariables={{
          candidate_name: userName,
          profession: profession,
          profession_context: context,
          years_of_experience: worker.years_exp?.toString() ?? "0",
        }}
        user={{
          name: userName,
          imageUrl: worker.photo_url ?? "",
        }}
        returnPath="/worker/assessments"
      />
    </VoiceProvider>
  );
}
