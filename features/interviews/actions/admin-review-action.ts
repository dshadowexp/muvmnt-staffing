"use server";

import { addDays, format } from "date-fns";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import {
  submitInterviewReview,
  promoteWorkerToCompliance,
} from "@/features/interviews/dal/admin-mutations";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";
import { tasks } from "@trigger.dev/sdk/v3";

// Server action for admin to submit pass/fail decision
export async function submitInterviewReviewAction(
  interviewId: string,
  result: "pass" | "fail",
): Promise<{ error: boolean; message?: string }> {
  // 1. Auth check
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated." };
  if (session.role !== "admin") return { error: true, message: "Forbidden." };

  // 2. Submit review result
  let row: { userId: string } | null;
  try {
    row = await submitInterviewReview(interviewId, result);
  } catch (err) {
    return {
      error: true,
      message: err instanceof Error ? err.message : "Failed to submit review.",
    };
  }

  if (!row) return { error: true, message: "Interview not found." };

  // 3. On a pass verdict, immediately promote the worker to the compliance
  //    stage (fire-and-forget). The mutation is guarded — it only updates if
  //    the worker is still in the interview stage, so re-reviewing old
  //    interviews cannot regress a further-along worker.
  let promoted = false;
  if (result === "pass") {
    promoted = await promoteWorkerToCompliance(row.userId).catch((err) => {
      console.error("[admin-review-action] promoteWorkerToCompliance failed", err);
      return false;
    });
  }

  // 4. Fetch worker's first name and (for fail) the interview completed_at date
  let firstName = "there";
  let retryDate: string | null = null;
  try {
    const supabase = await createAdminClient();
    const [workerRes, interviewRes] = await Promise.all([
      supabase
        .from("workers")
        .select("first_name")
        .eq("user_id", row.userId)
        .maybeSingle(),
      result === "fail"
        ? supabase
            .from("interviews")
            .select("completed_at")
            .eq("id", interviewId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (workerRes.data?.first_name) firstName = workerRes.data.first_name;
    if (result === "fail") {
      const completedAt = interviewRes.data?.completed_at
        ? new Date(interviewRes.data.completed_at)
        : new Date();
      retryDate = format(addDays(completedAt, 21), "MMMM d, yyyy");
    }
  } catch {
    // Non-fatal — proceed with fallbacks
    if (result === "fail") {
      retryDate = format(addDays(new Date(), 21), "MMMM d, yyyy");
    }
  }

  const template = result === "pass" ? "interview-passed" : "interview-failed";
  const complianceUrl = `${env.APP_URL}/staff/compliance`;
  const dashboardUrl = `${env.APP_URL}/staff`;

  const notificationData = {
    firstName,
    complianceUrl,
    dashboardUrl,
    ...(retryDate ? { retryDate } : {}),
  };

  // 5. Enqueue email + push notification (fire-and-forget on failure — the
  //    review has already been persisted so this is non-critical)
  try {
    await enqueueNotification({
      userId: row.userId,
      channels: [
        {
          channel: "email",
          subject:
            result === "pass"
              ? "You passed your interview — next step: compliance documents"
              : "About your ReadyKare interview",
          template,
          data: notificationData,
        },
        {
          channel: "push",
          template,
          data: notificationData,
        },
      ],
    });
  } catch (err) {
    console.error("[admin-review-action] enqueueNotification failed", err);
  }

  return { error: false };
}

// Server action for admin to retry failed video analysis
export async function retryVideoAnalysisAction(
  interviewId: string,
): Promise<{ error: boolean; message?: string }> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated." };
  if (session.role !== "admin") return { error: true, message: "Forbidden." };

  const supabase = await createAdminClient();

  const { data: interview, error: fetchError } = await supabase
    .from("interviews")
    .select("user_id, recording_url")
    .eq("id", interviewId)
    .maybeSingle();

  if (fetchError) return { error: true, message: fetchError.message };
  if (!interview) return { error: true, message: "Interview not found." };
  if (!interview.recording_url) return { error: true, message: "No recording found for this interview." };

  // Normalise: strip full URL prefix if stored as a public URL (legacy rows)
  const recordingKey = /^https?:\/\//i.test(interview.recording_url)
    ? new URL(interview.recording_url).pathname.replace(/^\/[^/]+\//, "") // strip /bucket/
    : interview.recording_url;

  // Reset status to pending so the UI reflects the re-run immediately
  await supabase
    .from("interviews")
    .update({ video_feedback_status: "pending", video_feedback: null })
    .eq("id", interviewId);

  try {
    await tasks.trigger("interviews.analyze-video", {
      interviewId,
      userId: interview.user_id,
      recordingKey,
    });
  } catch (err) {
    return {
      error: true,
      message: err instanceof Error ? err.message : "Failed to trigger video analysis.",
    };
  }

  return { error: false };
}
