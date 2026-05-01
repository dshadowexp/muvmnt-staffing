import { streamAiInterviewFeedback } from "@/services/ai/interviews/interviews";
import { createAdminClient } from "@/supabase/server";
import type { Database } from "@/supabase/types/database";
import { getInterviewByIdForUser } from "./queries";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import { aiInterviewTitle } from "@/features/interviews/lib/interview-ai-title";
import { getCurrentUser } from "@/features/users/dal/queries";

export type InterviewInsert = Database["public"]["Tables"]["interviews"]["Insert"];
export type InterviewUpdate = Database["public"]["Tables"]["interviews"]["Update"];
export type InterviewRow = Database["public"]["Tables"]["interviews"]["Row"];

export async function insertInterview(
  payload: InterviewInsert,
): Promise<InterviewRow> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("interviews")
    .insert(payload)
    .select()
    .single();

  if (error) {
    // Phase 1: interview creation is "get-or-create" but can race under parallel requests.
    // If a unique constraint is hit, fall back to selecting the existing row.
    if (error.code === "23505") {
      if (payload.user_id) {
        // Worker interview (one per user): screening_id is null.
        if (payload.screening_id == null) {
          const { data: existing, error: e2 } = await supabase
            .from("interviews")
            .select("*")
            .eq("user_id", payload.user_id)
            .is("screening_id", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (e2 && e2.code !== "PGRST116") throw new Error(e2.message);
          if (existing) return existing as InterviewRow;
        } else {
          // Screening interview (one per user per screening)
          const { data: existing, error: e2 } = await supabase
            .from("interviews")
            .select("*")
            .eq("user_id", payload.user_id)
            .eq("screening_id", payload.screening_id)
            .maybeSingle();

          if (e2 && e2.code !== "PGRST116") throw new Error(e2.message);
          if (existing) return existing as InterviewRow;
        }
      }
    }

    throw new Error(error.message);
  }
  if (data == null) throw new Error("Interview insert returned no row");
  return data;
}

/**
 * Updates a row only when `id` belongs to `userId`.
 * Returns the updated row, or `null` if no row matched.
 */
export async function updateInterviewByOwner(
  id: string,
  userId: string,
  patch: InterviewUpdate,
): Promise<InterviewRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("interviews")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

export async function generateInterviewFeedback(interviewId: string) {
    const user = await getCurrentUser();
    if (user == null) {
      return { error: true, message: "Not authenticated" };
    }

    const interview = await getInterviewByIdForUser(interviewId, user.id)
    if (interview == null) {
      return {
        error: true,
        message: "You don't have permission to do this",
      }
    }
  
    if (interview.hume_chat_id == null) {
      return {
        error: true,
        message: "Interview has not been completed yet",
      }
    }
  
    const subjectRef = parseInterviewSubjectRef(interview.subject_ref);

    const feedback = await streamAiInterviewFeedback({
      humeChatId: interview.hume_chat_id,
      humeGroupChatId: interview.chat_group_id,
      interviewInfo: {
        title: aiInterviewTitle({
          screeningId: interview.screening_id,
          subjectRef: interview.subject_ref,
        }),
        profession: subjectRef.profession.trim().length > 0
          ? subjectRef.profession
          : "General",
        description: subjectRef.resumeSummary,
      },
      userName: user.email ?? "",
    });
  
    if (feedback == null) {
      return { error: true, message: "Failed to generate feedback" };
    }
  
    // await updateInterviewByOwner(interviewId, user.id, { feedback });
    return { error: false };
  }