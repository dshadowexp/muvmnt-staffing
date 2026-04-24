import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { fetchChatMessages } from "@/services/hume/lib/api";
import { condenseChatMessages } from "@/services/hume/lib/condense-chat-messages";
import { formatDateTime } from "@/lib/formatters";
import { interviewRetryEligibleAt } from "@/features/interviews/lib/interview-feedback-json";
import { InterviewReviewClient } from "./_review-client";

export default async function InterviewReviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const locale = await getLocale();

  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  if (session.role !== "admin") return redirect({ href: "/dashboard", locale });

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (interview == null) return notFound();

  const worker = await getWorkerProfile();
  const t = await getTranslations("assessments.interview");

  const userName =
    [worker?.first_name, worker?.last_name].filter(Boolean).join(" ") ||
    t("candidateFallback");

  // Fetch messages lazily — the promise is streamed to the client and
  // resolved inside the "View messages" dialog under a Suspense boundary.
  const messagesPromise = interview.hume_chat_id
    ? fetchChatMessages(interview.hume_chat_id, interview.chat_group_id).then(condenseChatMessages)
    : Promise.resolve([]);

  const backHref = "/dashboard/admin/assessments";

  // Format dates on the server so the client renders identical text on both
  // SSR and hydration (avoids Intl locale/timezone mismatches).
  const completedOnLabel = formatDateTime(
    new Date(interview.completed_at ?? interview.created_at),
  );
  const retakeEligibleAt = interviewRetryEligibleAt(interview.completed_at);
  const retakeAfterLabel = retakeEligibleAt
    ? formatDateTime(retakeEligibleAt)
    : null;

  return (
    <InterviewReviewClient
      interview={{
        id: interview.id,
        subject: interview.subject,
        duration: interview.duration,
        completedAt: interview.completed_at,
        completedOnLabel,
        retakeAfterLabel,
        feedback: interview.feedback,
        canStreamFeedback:
          interview.hume_chat_id != null && interview.feedback == null,
        reviewed: interview.reviewed
      }}
      user={{ name: userName, imageUrl: worker?.photo_url ?? "" }}
      messagesPromise={messagesPromise}
      backHref={backHref}
    />
  );
}
