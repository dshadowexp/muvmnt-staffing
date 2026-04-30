import "server-only";

import { getWorkerInterviewForUser, type InterviewRow } from "../dal/queries";
import { insertInterview } from "../dal/mutations";
import { isAssessmentInterviewLocked } from "./interview-feedback-json";
import { EMPTY_INTERVIEW_SUBJECT_REF } from "./interview-subject-ref";

/**
 * Returns the worker's active combined interview, creating a fresh one when
 * none exists or when a failed attempt has passed its retake window.
 *
 * Rules:
 *  - No existing interview          → create and return a bare row
 *  - Existing, not yet completed    → return it (in-progress session)
 *  - Existing, completed + locked   → return it (caller decides to redirect)
 *  - Existing, completed + retake   → create a new bare row
 */
export async function getOrCreateCombinedInterview(
  userId: string,
): Promise<InterviewRow> {
  const existing = await getWorkerInterviewForUser(userId);

  if (existing == null) {
    return insertInterview({
      user_id: userId,
      subject_ref: EMPTY_INTERVIEW_SUBJECT_REF,
    });
  }

  // Still in progress — resume it
  if (existing.completed_at == null) return existing;

  // Completed + locked (passed, or failed inside retry window) — hand back as-is
  if (isAssessmentInterviewLocked(existing)) return existing;

  // Completed + failed + retake window elapsed — start a fresh attempt
  return insertInterview({
    user_id: userId,
    subject_ref: EMPTY_INTERVIEW_SUBJECT_REF,
  });
}
