"use server";

import { createAdminClient } from "@/services/supabase/server";

/**
 * Submit an admin pass/fail decision for an interview.
 * Sets `result`, `reviewed = true`, and `updated_at`.
 * Returns `{ userId, subject }` for the caller to enqueue notifications and
 * trigger stage promotion, or null if the interview was not found.
 */
export async function submitInterviewReview(
  interviewId: string,
  result: "pass" | "fail",
): Promise<{ userId: string; subject: string } | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("interviews")
    .update({
      result,
      reviewed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId)
    .select("user_id, subject")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return { userId: data.user_id, subject: data.subject };
}

/**
 * Promotes a worker from the "interview" stage to "compliance".
 *
 * The update is guarded so it only fires when the worker's current stage is
 * null or "interview" — this prevents accidentally overwriting a stage that
 * has already advanced further (e.g. if an admin re-reviews an old interview).
 *
 * Returns true when the row was updated, false when the guard condition
 * prevented it (worker was already past interview stage).
 */
export async function promoteWorkerToCompliance(
  userId: string,
): Promise<boolean> {
  const supabase = await createAdminClient();

  const { data: updated, error } = await supabase
    .from("workers")
    .update({ stage: "compliance" })
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return updated != null;
}
