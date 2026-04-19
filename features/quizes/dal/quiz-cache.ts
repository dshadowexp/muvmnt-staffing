import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/services/supabase/types/database";

/**
 * Cache of generated MCQ question sets, keyed by skill + a deterministic hash
 * of the generation inputs. NOTE: the DB column is still named
 * `certification_id` (FK currently points at `compliances`). Callers pass a
 * skill id here; the FK mismatch is caught silently by this layer so writes
 * are best-effort until the DB is migrated to reference `skills`.
 */
export async function getSkillQuizCache(
  supabase: SupabaseClient<Database>,
  skillId: string,
  generationHash: string,
): Promise<{ questions: unknown } | null> {
  const { data, error } = await supabase
    .from("certification_quiz_cache")
    .select("questions")
    .eq("certification_id", skillId)
    .eq("file_sha256", generationHash)
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    if (
      error.code === "42P01" ||
      error.code === "23503" ||
      msg.includes("certification_quiz_cache") ||
      msg.includes("Could not find the table") ||
      msg.includes("foreign key")
    ) {
      return null;
    }
    throw new Error(error.message);
  }
  return data;
}

export async function upsertSkillQuizCache(
  supabase: SupabaseClient<Database>,
  payload: {
    skill_id: string;
    generation_hash: string;
    questions: unknown;
  },
): Promise<void> {
  const { error } = await supabase.from("certification_quiz_cache").upsert(
    {
      certification_id: payload.skill_id,
      file_sha256: payload.generation_hash,
      questions: payload.questions as Json,
    },
    { onConflict: "certification_id,file_sha256" },
  );

  if (error) {
    const msg = error.message ?? "";
    if (
      error.code === "42P01" ||
      error.code === "23503" ||
      msg.includes("certification_quiz_cache") ||
      msg.includes("Could not find the table") ||
      msg.includes("foreign key")
    ) {
      return;
    }
    throw new Error(error.message);
  }
}
