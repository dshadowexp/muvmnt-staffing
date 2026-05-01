import type { Database } from "@/supabase/types/database";
import type { InterviewFeedback, InterviewScore } from "@/services/ai/interviews/schema";

export type InterviewFeedbackParsed = {
  candidate_name?: string;
  interview_type?: string;
  decision: "PASS" | "FAIL";
  average_score?: number;
  scores: InterviewScore[];
  strengths?: string[];
  weaknesses?: string[];
  risk_flags?: string[];
  summary?: string;
};

type RawFeedback = Database["public"]["Tables"]["interviews"]["Row"]["feedback"];

function coerceScores(value: unknown): InterviewScore[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry == null || typeof entry !== "object") return null;
        const raw = entry as { label?: unknown; score?: unknown };
        if (typeof raw.label !== "string") return null;
        if (typeof raw.score !== "number") return null;
        return { label: raw.label, score: raw.score } satisfies InterviewScore;
      })
      .filter((s): s is InterviewScore => s != null);
  }

  if (value != null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, score]) => {
        if (typeof score !== "number") return null;
        return {
          label: label.replace(/_/g, " "),
          score,
        } satisfies InterviewScore;
      })
      .filter((s): s is InterviewScore => s != null);
  }

  return [];
}

function normalizeRecord(record: Record<string, unknown>): InterviewFeedbackParsed | null {
  const decision = record.decision;
  if (decision !== "PASS" && decision !== "FAIL") return null;

  return {
    candidate_name:
      typeof record.candidate_name === "string"
        ? record.candidate_name
        : undefined,
    interview_type:
      typeof record.interview_type === "string"
        ? record.interview_type
        : undefined,
    decision,
    average_score:
      typeof record.average_score === "number"
        ? record.average_score
        : undefined,
    scores: coerceScores(record.scores),
    strengths: Array.isArray(record.strengths)
      ? (record.strengths as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : undefined,
    weaknesses: Array.isArray(record.weaknesses)
      ? (record.weaknesses as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : undefined,
    risk_flags: Array.isArray(record.risk_flags)
      ? (record.risk_flags as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : undefined,
    summary: typeof record.summary === "string" ? record.summary : undefined,
  };
}

export function parseInterviewFeedback(
  data: RawFeedback,
): InterviewFeedbackParsed | null {
  if (data == null) return null;
  try {
    if (typeof data === "string") {
      let t = data.trim();
      if (t.startsWith("```")) {
        t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/m, "");
      }
      const parsed = JSON.parse(t);
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed))
        return null;
      return normalizeRecord(parsed as Record<string, unknown>);
    }
    if (typeof data === "object" && !Array.isArray(data)) {
      return normalizeRecord(data as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize a partial feedback object streamed from the API into the same
 * display shape used for persisted rows. Tolerates `undefined` fields so the
 * UI can progressively reveal sections as data arrives.
 */
export function normalizePartialFeedback(
  data: Partial<InterviewFeedback> | null | undefined,
): Partial<InterviewFeedbackParsed> {
  if (data == null) return { scores: [] };
  const scores = coerceScores(data.scores);
  return {
    candidate_name: data.candidate_name ?? undefined,
    interview_type: data.interview_type ?? undefined,
    decision:
      data.decision === "PASS" || data.decision === "FAIL"
        ? data.decision
        : undefined,
    average_score:
      typeof data.average_score === "number" ? data.average_score : undefined,
    scores,
    strengths: data.strengths?.filter(
      (s): s is string => typeof s === "string",
    ),
    weaknesses: data.weaknesses?.filter(
      (s): s is string => typeof s === "string",
    ),
    risk_flags: data.risk_flags?.filter(
      (s): s is string => typeof s === "string",
    ),
    summary: data.summary ?? undefined,
  };
}

/** Strip fences / parse; returns compact JSON string for DB `feedback` jsonb. */
export function normalizeFeedbackJsonString(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/m, "");
  }
  const parsed = JSON.parse(t) as unknown;
  return JSON.stringify(parsed);
}

const RETRY_MS = 3 * 24 * 60 * 60 * 1000;

export function interviewRetryEligibleAt(completedAtIso: string | null): Date | null {
  if (!completedAtIso) return null;
  return new Date(new Date(completedAtIso).getTime() + RETRY_MS);
}

export function canRetakeFailedInterview(
  feedback: InterviewFeedbackParsed | null,
  completedAtIso: string | null,
): boolean {
  if (feedback?.decision !== "FAIL") return false;
  const at = interviewRetryEligibleAt(completedAtIso);
  if (!at) return false;
  return Date.now() >= at.getTime();
}

export function isAssessmentInterviewLocked(
  row: Pick<
    Database["public"]["Tables"]["interviews"]["Row"],
    "feedback" | "completed_at" | "feedback_status"
  >,
): boolean {
  if (row.completed_at == null) return false;

  // New, explicit state machine. If feedback generation failed, do not hard-lock
  // the interview forever — allow regeneration / recreation.
  if (row.feedback_status === "failed") return false;
  if (row.feedback_status === "pending" || row.feedback_status === "generating") {
    return true;
  }

  const parsed = parseInterviewFeedback(row.feedback);
  // If feedback is missing/unparseable, treat as unlocked so we don't dead-end users.
  if (parsed == null) return false;
  if (parsed.decision === "PASS") return true;
  if (parsed.decision === "FAIL") {
    return !canRetakeFailedInterview(parsed, row.completed_at);
  }
  return true;
}
