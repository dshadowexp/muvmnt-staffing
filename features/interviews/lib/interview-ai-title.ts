import type { Json } from "@/services/supabase/types/database";
import { parseInterviewSubjectRef } from "./interview-subject-ref";

/** Short label for AI feedback prompts (replaces legacy interviews.subject). */
export function aiInterviewTitle(params: {
  screeningId: string | null;
  subjectRef: Json | null;
}): string {
  if (params.screeningId) return "Screening interview";
  const ref = parseInterviewSubjectRef(params.subjectRef);
  const p = ref.profession.trim();
  if (p.length > 0) return p;
  return "Practice interview";
}
