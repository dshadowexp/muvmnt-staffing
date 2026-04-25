import type { Database } from "@/services/supabase/types/database";

type Json = Database["public"]["Tables"]["interviews"]["Row"]["subject_ref"];

/**
 * Canonical shape stored in `interviews.subject_ref` (JSONB).
 *
 * - `resumeUrl`        — storage object key for the uploaded resume file.
 *                        Empty string when no file is associated.
 * - `resumeSummary`    — JSON-encoded structured AI summary of the resume.
 *                        Empty string before the summary has been generated.
 * - `uploadCount`      — number of times the resume has been (re)uploaded.
 *                        Capped at RESUME_UPLOAD_LIMIT before the interview locks.
 * - `profession`       — human-readable profession label at the time of upload.
 * - `professionContext`— profession-specific AI context string at time of upload.
 */
export type InterviewSubjectRef = {
  resumeUrl: string;
  resumeSummary: string;
  uploadCount: number;
  profession: string;
  professionContext: string;
};

export const RESUME_UPLOAD_LIMIT = 3;

export const EMPTY_INTERVIEW_SUBJECT_REF: InterviewSubjectRef = {
  resumeUrl: "",
  resumeSummary: "",
  uploadCount: 0,
  profession: "",
  professionContext: "",
};

export function parseInterviewSubjectRef(value: Json | undefined): InterviewSubjectRef {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_INTERVIEW_SUBJECT_REF };
  }

  const obj = value as Record<string, unknown>;

  return {
    resumeUrl:         typeof obj.resumeUrl === "string"         ? obj.resumeUrl         : "",
    resumeSummary:     typeof obj.resumeSummary === "string"     ? obj.resumeSummary     : "",
    uploadCount:       typeof obj.uploadCount === "number" && Number.isFinite(obj.uploadCount)
                         ? Math.max(0, Math.trunc(obj.uploadCount))
                         : 0,
    profession:        typeof obj.profession === "string"        ? obj.profession        : "",
    professionContext: typeof obj.professionContext === "string" ? obj.professionContext : "",
  };
}