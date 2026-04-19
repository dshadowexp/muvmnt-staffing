"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { generateAiInterviewFeedback } from "@/services/ai/interviews";
import {
  getInterviewByIdForUser,
  getInterviewBySubjectForUser,
  type InterviewRow,
} from "./dal/queries";
import {
  insertInterview,
  updateInterviewByOwner,
  type InterviewUpdate,
} from "./dal/mutations";
import {
  isAssessmentInterviewLocked,
  normalizeFeedbackJsonString,
} from "@/features/interviews/lib/interview-feedback-json";
import {
  parseInterviewSubjectRef,
  RESUME_UPLOAD_LIMIT,
  type InterviewSubjectRef,
} from "@/features/interviews/lib/interview-subject-ref";

export type GetInterviewResult =
  | { error: true; message: string; data: null }
  | { error: false; data: InterviewRow };

const RETRY_SUBJECTS = new Set(["profession", "resume"]);

export async function createAssessmentInterview({
  subject,
  subjectRef,
}: {
  subject: string;
  subjectRef: InterviewSubjectRef;
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  if (RETRY_SUBJECTS.has(subject)) {
    const existing = await getInterviewBySubjectForUser(
      subject,
      session.userId,
    );
    if (existing && isAssessmentInterviewLocked(existing)) {
      return { error: false, id: existing.id };
    }
  }

  try {
    const row = await insertInterview({
      user_id: session.userId,
      subject,
      subject_ref: {
        key: subjectRef.key,
        body: subjectRef.body,
        limit: subjectRef.limit,
      },
    });
    return { error: false, id: row.id };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to create interview";
    return { error: true, message };
  }
}

export async function updateInterview(
  id: string,
  data: {
    humeChatId?: string;
    duration?: string;
    feedback?: InterviewUpdate["feedback"];
    completedAt?: string | null;
  },
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const patch: InterviewUpdate = {};
  if (data.humeChatId !== undefined) patch.hume_chat_id = data.humeChatId;
  if (data.duration !== undefined) patch.duration = data.duration;
  if (data.feedback !== undefined) patch.feedback = data.feedback;
  if (data.completedAt !== undefined) patch.completed_at = data.completedAt;

  if (Object.keys(patch).length === 0) {
    return { error: false };
  }

  try {
    const row = await updateInterviewByOwner(id, session.userId, patch);
    if (row == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update interview";
    return { error: true, message };
  }
}

export async function updateInterviewSubjectRefBody(
  id: string,
  body: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const interview = await getInterviewByIdForUser(id, session.userId);
  if (interview == null) {
    return { error: true, message: "Interview not found" };
  }

  const existing = parseInterviewSubjectRef(interview.subject_ref);

  try {
    const row = await updateInterviewByOwner(id, session.userId, {
      subject_ref: { key: existing.key, body, limit: existing.limit },
    });
    if (row == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update interview";
    return { error: true, message };
  }
}

/**
 * Records a (re)upload of the interview's underlying file. Increments
 * `subject_ref.limit`, swaps the storage `key`, and clears the cached `body`
 * so the new summary can stream in. Refuses to bump past the configured cap.
 */
export async function bumpInterviewSubjectRefUpload(
  id: string,
  newKey: string,
): Promise<
  | { error: true; message: string; reason?: "limit_reached" }
  | { error: false; limit: number }
> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const interview = await getInterviewByIdForUser(id, session.userId);
  if (interview == null) {
    return { error: true, message: "Interview not found" };
  }

  const existing = parseInterviewSubjectRef(interview.subject_ref);
  if (existing.limit >= RESUME_UPLOAD_LIMIT) {
    return {
      error: true,
      message: "Maximum number of resume changes reached",
      reason: "limit_reached",
    };
  }

  const nextLimit = existing.limit + 1;

  try {
    const row = await updateInterviewByOwner(id, session.userId, {
      subject_ref: { key: newKey, body: "", limit: nextLimit },
    });
    if (row == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false, limit: nextLimit };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update interview";
    return { error: true, message };
  }
}

/**
 * Clears the `key` and `body` from an interview's `subject_ref` while
 * preserving the row and its `limit` counter, so the user can re-upload
 * (and the limit keeps climbing). Refuses once the cap has been hit.
 */
export async function clearInterviewSubjectRefFile(
  id: string,
): Promise<
  | { error: true; message: string; reason?: "limit_reached" }
  | { error: false; limit: number }
> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const interview = await getInterviewByIdForUser(id, session.userId);
  if (interview == null) {
    return { error: true, message: "Interview not found" };
  }

  const existing = parseInterviewSubjectRef(interview.subject_ref);
  if (existing.limit >= RESUME_UPLOAD_LIMIT) {
    return {
      error: true,
      message: "Maximum number of resume changes reached",
      reason: "limit_reached",
    };
  }

  try {
    const row = await updateInterviewByOwner(id, session.userId, {
      subject_ref: { key: "", body: "", limit: existing.limit },
    });
    if (row == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false, limit: existing.limit };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update interview";
    return { error: true, message };
  }
}

export async function deleteAssessmentInterview(
  id: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const interview = await getInterviewByIdForUser(id, session.userId);
  if (interview == null) {
    return { error: false };
  }

  if (isAssessmentInterviewLocked(interview)) {
    return { error: true, message: "Interview cannot be deleted" };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false };
}

export async function generateInterviewFeedback(
  interviewId: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (interview == null) {
    return { error: true, message: "Interview not found" };
  }

  if (interview.hume_chat_id == null || interview.hume_chat_id === "") {
    return {
      error: true,
      message: "Interview has not been completed yet",
    };
  }

  const supabase = await createAdminClient();

  const { data: worker, error: wErr } = await supabase
    .from("workers")
    .select("first_name, last_name, years_exp, profession")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (wErr) {
    return { error: true, message: wErr.message };
  }

  const userName =
    worker != null
      ? `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim()
      : "Candidate";

  const subjectRef = parseInterviewSubjectRef(interview.subject_ref);
  const description =
    subjectRef.body.trim().length > 0
      ? subjectRef.body
      : "General interview practice session.";

  try {
    const feedback = await generateAiInterviewFeedback({
      humeChatId: interview.hume_chat_id,
      interviewInfo: {
        title: interview.subject.replace(/_/g, " "),
        profession: worker?.profession ?? "General",
        description,
      },
      userName: userName.length > 0 ? userName : "Candidate",
    });

    if (feedback == null || feedback.trim() === "") {
      return { error: true, message: "Failed to generate feedback" };
    }

    let feedbackJson: unknown;
    try {
      feedbackJson = JSON.parse(normalizeFeedbackJsonString(feedback));
    } catch {
      return { error: true, message: "Invalid feedback format from model" };
    }

    const updated = await updateInterviewByOwner(interviewId, session.userId, {
      feedback: feedbackJson as InterviewUpdate["feedback"],
    });
    if (updated == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate feedback";
    return { error: true, message };
  }
}

export async function getInterview(
  id: string,
): Promise<GetInterviewResult> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated", data: null };
  }

  try {
    const row = await getInterviewByIdForUser(id, session.userId);
    if (row == null) {
      return { error: true, message: "Interview not found", data: null };
    }
    return { error: false, data: row };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load interview";
    return { error: true, message, data: null };
  }
}
