import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireAdminSession } from "@/features/admin/dal/queries";
import { getAdminInterview } from "@/features/interviews/dal/admin-queries";
import { AdminInterviewReviewClient } from "./_client";
import { condenseChatMessages } from "@/services/hume/lib/condense-chat-messages";
import { fetchChatMessages } from "@/services/hume/lib/api";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import type { ResumeSummary } from "@/services/ai/resumes/schema";

export default async function AdminInterviewReviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  await requireAdminSession();
  const { interviewId } = await params;

  const interview = await getAdminInterview(interviewId);
  if (!interview) return notFound();

  const messagesPromise = interview.hume_chat_id
    ? fetchChatMessages(interview.hume_chat_id, interview.chat_group_id).then(condenseChatMessages)
    : Promise.resolve([]);

  // Resolve recording S3 key → presigned playable URL
  let recordingUrl: string | null = null;
  if (interview.recording_url) {
    try {
      // console.log(key);
      const g = await getPresignedDownloadUrl(interview.recording_url);
      // console.log(g.url);
      recordingUrl = g.url;
      // console.log(recordingUrl);
    } catch {
      // console.error("Error getting recording URL", interview.recording_url);
      // Non-fatal — video won't render but rest of page still loads
    }
  }

  // Parse subject_ref to extract resume summary
  const subjectRef = parseInterviewSubjectRef(interview.subject_ref);
  let resumeSummary: ResumeSummary | null = null;
  if (subjectRef.resumeSummary) {
    try {
      resumeSummary = JSON.parse(subjectRef.resumeSummary) as ResumeSummary;
    } catch {
      // Non-fatal — resume card won't render
    }
  }

  const subjectLabel =
    interview.subject === "combined"
      ? "Combined Interview"
      : interview.subject === "profession"
        ? "Profession Interview"
        : "Resume Interview";

  const completedLabel = interview.completed_at
    ? format(new Date(interview.completed_at), "MMM d, yyyy 'at' h:mm a")
    : null;

  return (
    <AdminInterviewReviewClient
      interview={interview}
      messagesPromise={messagesPromise}
      subjectLabel={subjectLabel}
      user={{ name: "Candidate Name", imageUrl: "" }}
      completedLabel={completedLabel}
      recordingUrl={recordingUrl}
      resumeSummary={resumeSummary}
    />
  );
}
