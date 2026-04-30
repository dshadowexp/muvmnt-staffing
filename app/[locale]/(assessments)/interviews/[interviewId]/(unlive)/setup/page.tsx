import { Suspense } from "react";
import { CircleDashedIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { SetupClient } from "./_client";


export default async function InterviewSetupPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin" />
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

  // Only workers/candidates should enter setup.
  if (session.role !== "worker" && session.role !== "candidate") {
    return redirect({ href: "/dashboard", locale });
  }

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (!interview) return redirect({ href: "/dashboard", locale });

  // Title/description:
  // - screening interview: use screening title/description if available
  // - assessment interview: use i18n defaults
  const tResume = await getTranslations("assessments.interview.resume");
  const title = tResume("interviewTitle");
  const description = tResume("interviewDescription", { minutes: 15 });

  let resolvedTitle = title;
  let resolvedDescription = description;

  if (interview.screening_id) {
    const supabase = await createAdminClient();
    const { data: screening } = await supabase
      .from("screenings")
      .select("title, description, interview_duration, allowed_languages")
      .eq("id", interview.screening_id)
      .maybeSingle();

    if (screening?.title) resolvedTitle = screening.title;
    if (screening?.description) resolvedDescription = screening.description;

    return (
      <SetupClient
        interviewId={interview.id}
        title={resolvedTitle}
        description={resolvedDescription}
        durationMins={screening?.interview_duration ?? 15}
        allowedLocales={screening?.allowed_languages ?? ["en"]}
        savedLocale={interview.language ?? undefined}
        isResuming={!!interview.chat_group_id && !!interview.duration}
      />
    );
  }

  return (
    <SetupClient
      interviewId={interview.id}
      title={resolvedTitle}
      description={resolvedDescription}
      durationMins={15}
      allowedLocales={["en", "fr"]}
      savedLocale={interview.language ?? undefined}
      isResuming={!!interview.chat_group_id && !!interview.duration}
    />
  );
}

