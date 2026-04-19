import type { Database } from "@/services/supabase/types/database";

export type InterviewFeedbackParsed = {
  candidate_name?: string;
  interview_type?: string;
  decision: "PASS" | "FAIL";
  average_score?: number;
  scores?: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  risk_flags?: string[];
  summary?: string;
};

export function parseInterviewFeedback(
  data: Database["public"]["Tables"]["interviews"]["Row"]["feedback"],
): InterviewFeedbackParsed | null {
  if (data == null) return null;
  try {
    if (typeof data === "string") {
      let t = data.trim();
      if (t.startsWith("```")) {
        t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/m, "");
      }
      const parsed = JSON.parse(t) as InterviewFeedbackParsed;
      if (parsed?.decision !== "PASS" && parsed?.decision !== "FAIL") return null;
      return parsed;
    }
    if (typeof data === "object" && !Array.isArray(data)) {
      const o = data as InterviewFeedbackParsed;
      if (o.decision !== "PASS" && o.decision !== "FAIL") return null;
      return o;
    }
    return null;
  } catch {
    return null;
  }
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
    "feedback" | "completed_at"
  >,
): boolean {
  if (row.completed_at == null) return false;
  const parsed = parseInterviewFeedback(row.feedback);
  if (parsed == null) return true;
  if (parsed.decision === "PASS") return true;
  if (parsed.decision === "FAIL") {
    return !canRetakeFailedInterview(parsed, row.completed_at);
  }
  return true;
}
