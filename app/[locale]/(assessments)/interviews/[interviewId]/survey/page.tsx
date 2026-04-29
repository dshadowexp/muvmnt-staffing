import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { redirect } from "@/i18n/navigation";
import { SurveyClient } from "./_client";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-8 animate-spin text-muted-foreground" />
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

  // Decide where to land after the survey:
  //   screening interview (candidate)  → screening portal (shows completed state)
  //   screening interview (worker)     → worker dashboard
  //   assessment interview (worker)    → interview review page
  let redirectTo: string;
  if (interview.screening_id) {
    redirectTo =
      session.role === "candidate"
        ? `/s/${interview.screening_id}`
        : "/dashboard";
  } else {
    redirectTo = `/interviews/${interviewId}`;
  }

  return <SurveyClient interviewId={interviewId} redirectTo={redirectTo} />;
}
