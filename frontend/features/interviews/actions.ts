"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { generateAiInterviewFeedback } from "@/services/ai/interviews";
import { canCreateInterview } from "./permission";
import {
  getInterviewByIdForUser,
  type InterviewRow,
} from "./dal/queries";
import {
  insertInterview,
  updateInterviewByOwner,
  type InterviewUpdate,
} from "./dal/mutations";
import { STAFF_REQUEST_DISPLAY_TITLE } from "@/features/requests/constants";

export type GetInterviewResult =
  | { error: true; message: string; data: null }
  | { error: false; data: InterviewRow };

function jobInfoFromStaffRequest(row: {
  notes: string | null;
  requirements: string[];
}): { title: string; description: string; experienceLevel: string } {
  const descriptionParts = [
    row.notes?.trim(),
    ...(row.requirements?.length ? row.requirements : []),
  ].filter(Boolean);
  return {
    title: STAFF_REQUEST_DISPLAY_TITLE,
    description:
      descriptionParts.length > 0
        ? descriptionParts.join("\n\n")
        : "No additional description provided.",
    experienceLevel: "As listed in the job requirements",
  };
}

function jobInfoFromInterviewSubject(interview: InterviewRow): {
  title: string;
  description: string;
  experienceLevel: string;
} {
  return {
    title: interview.subject.replace(/_/g, " "),
    description:
      interview.subject_ref.trim().length > 0
        ? interview.subject_ref
        : "General interview practice session.",
    experienceLevel: "General",
  };
}

export async function createInterview({
  jobInfoId,
}: {
  jobInfoId: string;
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  if (!(await canCreateInterview())) {
    return { error: true, message: "Interview limit reached" };
  }

  try {
    const row = await insertInterview({
      user_id: session.userId,
      subject: "staff_request",
      subject_ref: jobInfoId,
    });
    return { error: false, id: row.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create interview";
    return { error: true, message };
  }
}

export async function updateInterview(
  id: string,
  data: {
    humeChatId?: string;
    duration?: string;
    feedback?: string;
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

  let jobInfo: { title: string; description: string; experienceLevel: string };
  if (interview.subject === "staff_request") {
    const { data: staffRequest, error: srErr } = await supabase
      .from("staff_requests")
      .select("notes, requirements")
      .eq("id", interview.subject_ref)
      .maybeSingle();

    if (srErr) {
      return { error: true, message: srErr.message };
    }
    if (staffRequest == null) {
      jobInfo = jobInfoFromInterviewSubject(interview);
    } else {
      jobInfo = jobInfoFromStaffRequest(staffRequest);
    }
  } else {
    jobInfo = jobInfoFromInterviewSubject(interview);
  }

  const { data: worker, error: wErr } = await supabase
    .from("workers")
    .select("first_name, last_name")
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
      jobInfo,
      userName: userName.length > 0 ? userName : "Candidate",
    });

    if (feedback == null || feedback.trim() === "") {
      return { error: true, message: "Failed to generate feedback" };
    }

    const updated = await updateInterviewByOwner(interviewId, session.userId, {
      feedback,
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
