import { createAdminClient } from "@/services/supabase/server";
import type { Json } from "@/services/supabase/types/database";

export type QuizInsert = {
  user_id: string;
  skill_id: string;
  questions: Json;
  total_questions: number;
  generation?: Json | null;
};

export type QuizUpdate = {
  questions?: Json;
  total_questions?: number;
  generation?: Json | null;
  answers?: Json;
  score?: number;
  passed?: boolean;
  completed_at?: string;
};

export async function insertQuiz(payload: QuizInsert) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("quizes")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (data == null) throw new Error("Quiz insert returned no row");
  return data;
}

export async function updateQuizByOwner(
  id: string,
  userId: string,
  patch: QuizUpdate,
) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("quizes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}
