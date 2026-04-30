import { Suspense } from "react";
import { CircleDashedIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getScreeningCandidate } from "@/features/screenings/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { ResumeStepClient } from "./_client";

export default async function ResumeStepPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SuspendedContent params={params} />
    </Suspense>
  );
}

async function SuspendedContent({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (!interview) return redirect({ href: "/dashboard", locale });

  const t = await getTranslations("assessments.interview.resumeStep");

  // Candidate (screening) — use screening description for context when available
  if (session.role === "candidate") {
    if (!interview.screening_id) return redirect({ href: "/", locale });
    const [candidate, supabase] = await Promise.all([
      getScreeningCandidate(session.userId, interview.screening_id),
      createAdminClient(),
    ]);
    if (!candidate) return redirect({ href: `/s/${interview.screening_id}`, locale });

    const { data: screening } = await supabase
      .from("screenings")
      .select("title, description, allowed_languages")
      .eq("id", interview.screening_id)
      .maybeSingle();

    return (
      <ResumeStepClient
        interviewId={interviewId}
        title={t("title")}
        subtitle={t("subtitle")}
        userName={[candidate.first_name, candidate.last_name].filter(Boolean).join(" ")}
        photoUrl={candidate.photo_url ?? null}
        existingInterview={interview}
        backHref={`/interviews/${interviewId}`}
        interviewTitle={screening?.title ?? undefined}
        interviewDescription={screening?.description ?? undefined}
        defaultProfessionContext={screening?.description ?? undefined}
        allowedLocales={screening?.allowed_languages ?? ["en"]}
      />
    );
  }

  // Worker assessment
  if (session.role !== "worker") return redirect({ href: "/dashboard", locale });
  const worker = await getWorkerProfile();
  if (!worker) return redirect({ href: "/dashboard", locale });

  const userName =
    [worker.first_name, worker.last_name].filter(Boolean).join(" ") || t("fallbackName");

  return (
    <ResumeStepClient
      interviewId={interviewId}
      title={t("title")}
      subtitle={t("subtitle")}
      userName={userName}
      photoUrl={worker.photo_url ?? null}
      existingInterview={interview}
      backHref={`/interviews/${interviewId}`}
      allowedLocales={["en", "fr"]}
    />
  );
}

