import { streamAiInterviewFeedback } from "@/services/ai/interviews/interviews";
import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";
import { getInterviewByIdForUser } from "./queries";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
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

  if (error) throw new Error(error.message);
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
        title: interview.subject,
        profession: interview.subject,
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