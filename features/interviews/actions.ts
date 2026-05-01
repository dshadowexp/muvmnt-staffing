"use server";

import { getSession } from "@/lib/get-session";
import { professionLabelEn } from "@/lib/labels-en";
import { createAdminClient } from "@/supabase/server";
import { streamAiInterviewFeedback } from "@/services/ai/interviews/interviews";
import {
  getInterviewByIdForUser,
  getWorkerInterviewForUser,
  type InterviewRow,
} from "./dal/queries";
import {
  insertInterview,
  updateInterviewByOwner,
  type InterviewUpdate,
} from "./dal/mutations";
import { s3Api } from "@/services/s3/api";
import {
  isAssessmentInterviewLocked,
  normalizeFeedbackJsonString,
} from "@/features/interviews/lib/interview-feedback-json";
import {
  parseInterviewSubjectRef,
  RESUME_UPLOAD_LIMIT,
  type InterviewSubjectRef,
} from "@/features/interviews/lib/interview-subject-ref";
import { aiInterviewTitle } from "@/features/interviews/lib/interview-ai-title";
import { tasks } from "@trigger.dev/sdk/v3";

export type GetInterviewResult =
  | { error: true; message: string; data: null }
  | { error: false; data: InterviewRow };

export async function createAssessmentInterview({
  subjectRef,
  language,
}: {
  subjectRef: InterviewSubjectRef;
  language?: string;
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const existingWorker = await getWorkerInterviewForUser(session.userId);
  if (existingWorker && isAssessmentInterviewLocked(existingWorker)) {
    return { error: false, id: existingWorker.id };
  }

  try {
    const row = await insertInterview({
      user_id: session.userId,
      language: language ?? null,
      subject_ref: {
        resumeUrl:         subjectRef.resumeUrl,
        resumeSummary:     subjectRef.resumeSummary,
        uploadCount:       subjectRef.uploadCount,
        profession:        subjectRef.profession,
        professionContext: subjectRef.professionContext,
      }
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
    chatGroupId?: string;
    feedback?: InterviewUpdate["feedback"];
    completedAt?: string | null;
    recordingUrl?: string;
  },
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const patch: InterviewUpdate = {};
  if (data.humeChatId !== undefined) patch.hume_chat_id = data.humeChatId;
  if (data.chatGroupId !== undefined) patch.chat_group_id = data.chatGroupId;
  if (data.duration !== undefined) patch.duration = data.duration;
  if (data.feedback !== undefined) patch.feedback = data.feedback;
  if (data.completedAt !== undefined) patch.completed_at = data.completedAt;
  if (data.recordingUrl !== undefined) patch.recording_url = data.recordingUrl;
  
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
      subject_ref: {
        resumeUrl:         existing.resumeUrl,
        resumeSummary:     body,
        uploadCount:       existing.uploadCount,
        profession:        existing.profession,
        professionContext: existing.professionContext,
      }
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
  if (existing.uploadCount >= RESUME_UPLOAD_LIMIT) {
    return {
      error: true,
      message: "Maximum number of resume changes reached",
      reason: "limit_reached",
    };
  }

  const nextCount = existing.uploadCount + 1;

  try {
    const row = await updateInterviewByOwner(id, session.userId, {
      subject_ref: {
        resumeUrl:         newKey,
        resumeSummary:     "",
        uploadCount:       nextCount,
        profession:        existing.profession,
        professionContext: existing.professionContext,
      }
    });
    if (row == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false, limit: nextCount };
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
  if (existing.uploadCount >= RESUME_UPLOAD_LIMIT) {
    return {
      error: true,
      message: "Maximum number of resume changes reached",
      reason: "limit_reached",
    };
  }

  try {
    const row = await updateInterviewByOwner(id, session.userId, {
      subject_ref: {
        resumeUrl:         "",
        resumeSummary:     "",
        uploadCount:       existing.uploadCount,
        profession:        existing.profession,
        professionContext: existing.professionContext,
      }
    });
    if (row == null) {
      return { error: true, message: "Interview not found" };
    }
    return { error: false, limit: existing.uploadCount };
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
  const description = subjectRef.resumeSummary.trim().length > 0
    ? subjectRef.resumeSummary
    : "General interview practice session.";

  const profession = subjectRef.profession.trim().length > 0
    ? subjectRef.profession
    : worker?.profession?.trim() ? professionLabelEn(worker.profession) : "General";

  try {
    const feedback = await streamAiInterviewFeedback({
      humeChatId: interview.hume_chat_id,
      humeGroupChatId: interview.chat_group_id,
      interviewInfo: {
        title: aiInterviewTitle({
          screeningId: interview.screening_id,
          subjectRef: interview.subject_ref,
        }),
        profession,
        description,
      },
      userName: userName.length > 0 ? userName : "Candidate",
    });

    if (feedback == null) { //|| feedback.trim() === "")
      return { error: true, message: "Failed to generate feedback" };
    }

    let feedbackJson: unknown;
    try {
      // feedbackJson = JSON.parse(normalizeFeedbackJsonString(feedback));
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

export async function saveInterviewSurveyAction(
  interviewId: string,
  survey: { rating: number; comment?: string },
): Promise<{ error: boolean; message?: string }> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  try {
    const row = await updateInterviewByOwner(interviewId, session.userId, {
      survey,
    });
    if (row == null) return { error: true, message: "Interview not found" };
    return { error: false };
  } catch (e) {
    return { error: true, message: e instanceof Error ? e.message : "Failed to save survey" };
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

// ─── Interview recording — multipart upload ───────────────────────────────────

/**
 * Step 1: called once when recording starts.
 * Creates the S3 multipart upload session and returns the (uploadId, key) pair
 * that the browser needs for subsequent part uploads.
 */
export async function initiateInterviewRecording(
  interviewId: string,
  mimeType: string,
): Promise<
  | { error: true; message: string }
  | { error: false; uploadId: string; key: string }
> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  try {
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const { uploadId, key } = await s3Api.initiateMultipartUpload({
      folder:   "interviews",
      ownerId:  interviewId,
      filename: `recording.${ext}`,
      mimeType,
    });
    return { error: false, uploadId, key };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to initiate upload";
    return { error: true, message };
  }
}

/**
 * Step 2 (per chunk): generates a presigned PUT URL for one S3 part.
 * The browser uploads the raw chunk bytes directly to S3 — this server
 * never handles the video data.
 */
export async function presignInterviewPart(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<{ error: true; message: string } | { error: false; url: string }> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  try {
    const url = await s3Api.presignedPartUrl({ key, uploadId, partNumber });
    return { error: false, url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to presign part";
    return { error: true, message };
  }
}

/**
 * Step 3: called after the last part is uploaded.
 * Completes the multipart upload on S3, then saves the recording URL to the
 * interview row so it can be played back.
 */
export async function finalizeInterviewRecording(
  interviewId: string,
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[],
): Promise<
  | { error: true; message: string }
  | { error: false; recordingUrl: string }
> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  try {
    const recordingUrl = await s3Api.completeMultipartUpload({
      key,
      uploadId,
      parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    });

    const updated = await updateInterviewByOwner(interviewId, session.userId, {
      recording_url: recordingUrl,
    });
    if (updated == null) {
      return { error: true, message: "Interview not found" };
    }

    // If this is a screening interview, advance the candidate to completed now
    // (best-effort — non-fatal if it fails)
    if (updated.screening_id) {
      const { updateCandidateStage } = await import(
        "@/features/screenings/dal/mutations"
      );
      await updateCandidateStage(
        session.userId,
        updated.screening_id,
        "completed",
      ).catch((err) => {
        console.error("[finalizeInterviewRecording] candidate stage advance failed", err);
      });
    }

    // Kick off background processing (feedback generation + video analysis)
    tasks
      .trigger("interviews.process", {
        interviewId,
        userId: session.userId,
        recordingKey: key,
      })
      .catch((err) => {
        console.error("[finalizeInterviewRecording] trigger failed", err);
      });

    return { error: false, recordingUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to finalize recording";
    return { error: true, message };
  }
}

/**
 * Best-effort cleanup — fire-and-forget on any recording error so incomplete
 * multipart uploads don't accumulate (S3 charges for stored parts).
 */
export async function abortInterviewRecording(
  key: string,
  uploadId: string,
): Promise<void> {
  await s3Api.abortMultipartUpload({ key, uploadId }).catch(() => {});
}
