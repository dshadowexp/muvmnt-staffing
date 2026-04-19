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

export type GetInterviewResult =
  | { error: true; message: string; data: null }
  | { error: false; data: InterviewRow };

const RETRY_SUBJECTS = new Set(["profession", "resume"]);

export async function createAssessmentInterview({
  subject,
  subjectRef,
}: {
  subject: string;
  subjectRef: string;
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
      subject_ref: subjectRef,
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

  try {
    const feedback = await generateAiInterviewFeedback({
      humeChatId: interview.hume_chat_id,
      interviewInfo: {
        title: interview.subject.replace(/_/g, " "),
        profession: worker?.profession ?? "General",
        description: interview.subject_ref.trim().length > 0 ? interview.subject_ref : "General interview practice session.",
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
