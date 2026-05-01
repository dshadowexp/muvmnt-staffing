import { createAdminClient } from "@/supabase/server";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** 65% of the 0–5 scoring rubric used by the AI feedback generator. */
const SCORE_THRESHOLD = 3.25;

// ---------------------------------------------------------------------------
// Type guards for the JSON blobs stored on the interviews row
// ---------------------------------------------------------------------------

type FeedbackBlob = {
  average_score: number;
  decision: string;
  [key: string]: unknown;
};

type VideoFeedbackBlob = {
  confidence: "low" | "medium" | "high";
  flags: Array<{ type: string; description: string }>;
  [key: string]: unknown;
};

function isPassingFeedback(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return false;
  const f = raw as FeedbackBlob;
  return typeof f.average_score === "number" && f.average_score >= SCORE_THRESHOLD;
}

function isCleanVideoFeedback(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return false;
  const v = raw as VideoFeedbackBlob;
  return (
    v.confidence === "low" &&
    Array.isArray(v.flags) &&
    v.flags.length === 0
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Attempts to auto-review an interview as "pass" when both the script
 * feedback and video integrity analysis clearly indicate a passing session.
 *
 * Criteria:
 *  - `feedback.average_score >= 3.25`  (≥ 65 % on the 0–5 rubric)
 *  - `video_feedback.confidence === "low"` AND `video_feedback.flags` is empty
 *
 * This is intentionally non-fatal: any error is logged and swallowed so the
 * parent trigger task is not affected. The function is also idempotent — if the
 * interview has already been reviewed (by admin or a previous run) it exits
 * immediately without touching the database.
 *
 * Both `generate-feedback` and `analyze-video` call this after they finish.
 * Whichever runs last will find both results present and trigger the promotion.
 */
export async function tryAutoReview(
  interviewId: string,
  userId: string,
): Promise<void> {
  const supabase = await createAdminClient();

  try {
    // 1. Load current state of the interview
    const { data: interview, error: fetchError } = await supabase
      .from("interviews")
      .select("id, reviewed, result, feedback, video_feedback, video_feedback_status")
      .eq("id", interviewId)
      .maybeSingle();

    if (fetchError || !interview) {
      console.error("[auto-review] Could not fetch interview", { interviewId, fetchError });
      return;
    }

    // 2. Exit early if already reviewed (admin acted first or previous run)
    if (interview.reviewed) {
      console.log("[auto-review] Already reviewed — skipping", { interviewId });
      return;
    }

    // 3. Exit early if either sub-task hasn't finished yet
    if (interview.video_feedback_status !== "completed" || interview.feedback == null) {
      console.log("[auto-review] Data not ready yet — skipping", {
        interviewId,
        videoFeedbackStatus: interview.video_feedback_status,
        hasFeedback: interview.feedback != null,
      });
      return;
    }

    // 4. Evaluate both criteria
    const feedbackPass = isPassingFeedback(interview.feedback);
    const videoPass = isCleanVideoFeedback(interview.video_feedback);

    console.log("[auto-review] Criteria evaluated", { interviewId, feedbackPass, videoPass });

    if (!feedbackPass || !videoPass) {
      console.log("[auto-review] Criteria not met — leaving for admin", {
        interviewId,
        feedbackPass,
        videoPass,
      });
      return;
    }

    // 5. Atomically mark as pass + reviewed (guard against concurrent admin review)
    const { error: reviewError, data: reviewedRows } = await supabase
      .from("interviews")
      .update({
        result: "pass",
        reviewed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interviewId)
      .eq("reviewed", false) // idempotency: only act if still unreviewed
      .select("id");

    if (reviewError) {
      console.error("[auto-review] Failed to mark interview as reviewed", { interviewId, reviewError });
      return;
    }

    // Empty array means admin reviewed concurrently — nothing more to do
    if (!reviewedRows || reviewedRows.length === 0) {
      console.log("[auto-review] Race condition — interview was reviewed concurrently, skipping", {
        interviewId,
      });
      return;
    }

    console.log("[auto-review] Interview auto-passed ✓", { interviewId });

    // 6. Load worker first name for personalised copy
    const { data: worker } = await supabase
      .from("workers")
      .select("first_name")
      .eq("user_id", userId)
      .maybeSingle();

    const firstName = worker?.first_name ?? "there";

    // 7. Promote worker to compliance stage
    const { error: promoteError } = await supabase
      .from("workers")
      .update({ stage: "compliance" })
      .eq("user_id", userId)
      .or("stage.is.null,stage.eq.interview");

    if (promoteError) {
      console.error("[auto-review] Failed to promote worker to compliance", {
        userId,
        promoteError,
      });
    } else {
      console.log("[auto-review] Worker promoted to compliance ✓", { userId });
    }

    // 8. Send email + push notification
    const complianceUrl = `${env.APP_URL}/staff/compliance`;
    const dashboardUrl = `${env.APP_URL}/staff`;

    const notificationData = {
      firstName,
      complianceUrl,
      dashboardUrl,
    };

    await enqueueNotification({
      userId,
      channels: [
        {
          channel: "email",
          subject: "You passed your interview — you're now in the compliance stage",
          template: "interview-passed",
          data: notificationData,
        },
        {
          channel: "push",
          template: "interview-passed",
          data: notificationData,
        },
      ],
    });

    console.log("[auto-review] Notification enqueued ✓", {
      interviewId,
      userId,
    });
  } catch (err) {
    // Non-fatal — never let auto-review failures bubble up to the parent task
    console.error("[auto-review] Unexpected error in tryAutoReview", {
      interviewId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
