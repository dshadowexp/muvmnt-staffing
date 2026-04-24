"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import {
  submitInterviewReview,
  promoteWorkerToCompliance,
} from "@/features/interviews/dal/admin-mutations";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";

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
  let row: { userId: string; subject: string } | null;
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

  // 4. Fetch worker's first name for personalised notification copy
  let firstName = "there";
  try {
    const supabase = await createAdminClient();
    const { data: worker } = await supabase
      .from("workers")
      .select("first_name")
      .eq("user_id", row.userId)
      .maybeSingle();
    if (worker?.first_name) firstName = worker.first_name;
  } catch {
    // Non-fatal — proceed with fallback
  }

  const template = result === "pass" ? "interview-passed" : "interview-failed";
  const complianceUrl = `${env.APP_URL}/dashboard/compliance`;
  const assessmentsUrl = `${env.APP_URL}/dashboard/assessments`;

  const notificationData = {
    firstName,
    subject: row.subject,
    // Pass both URLs; the template decides which to surface
    dashboardUrl: result === "pass" ? complianceUrl : assessmentsUrl,
    complianceUrl,
    promoted,
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
              : "Your interview result is in",
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
