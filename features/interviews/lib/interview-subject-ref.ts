import type { Database } from "@/services/supabase/types/database";

type Json = Database["public"]["Tables"]["interviews"]["Row"]["subject_ref"];

/**
 * Canonical shape stored in `interviews.subject_ref` (JSONB).
 *
 * - `key`   — storage object key for any underlying file (e.g. resume PDF).
 *             Empty string when the interview has no associated file.
 * - `body`  — opaque payload for the interview reference. For resume
 *             interviews this is a JSON-encoded structured summary; for
 *             profession interviews it's a plain profession string.
 * - `limit` — number of times the underlying source has been (re)uploaded.
 *             Used by the resume flow to cap how many resume swaps the
 *             user can perform before the interview is locked in.
 */
export type InterviewSubjectRef = {
  key: string;
  body: string;
  limit: number;
};

/** Maximum number of resume uploads allowed per interview. */
export const RESUME_UPLOAD_LIMIT = 3;

export const EMPTY_INTERVIEW_SUBJECT_REF: InterviewSubjectRef = {
  key: "",
  body: "",
  limit: 0,
};

/**
 * Safely coerces a stored `subject_ref` JSON value into the canonical
 * {@link InterviewSubjectRef} shape. Falls back to empty fields for missing
 * or legacy values, so callers never have to null-check.
 *
 * Accepts:
 *  - The current `{ key, body, limit }` shape.
 *  - The legacy `{ key, text }` shape (auto-migrated to `body`).
 *  - A bare string (legacy: stored as `body` with empty key).
 */
export function parseInterviewSubjectRef(
  value: Json | undefined,
): InterviewSubjectRef {
  if (value == null) return { ...EMPTY_INTERVIEW_SUBJECT_REF };

  if (typeof value === "string") {
    return { key: "", body: value, limit: 0 };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const key = typeof obj.key === "string" ? obj.key : "";
    const body =
      typeof obj.body === "string"
        ? obj.body
        : typeof obj.text === "string"
          ? obj.text
          : "";
    const limit =
      typeof obj.limit === "number" && Number.isFinite(obj.limit)
        ? Math.max(0, Math.trunc(obj.limit))
        : 0;
    return { key, body, limit };
  }

  return { ...EMPTY_INTERVIEW_SUBJECT_REF };
}
