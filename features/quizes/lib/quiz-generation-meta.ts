import type { Json } from "@/services/supabase/types/database";

export const QUIZ_TARGET_QUESTION_COUNT = 15;
export const QUIZ_FIRST_BATCH_SIZE = 5;

export type QuizGenerationMeta = {
  target_count: number;
  ready: boolean;
};

export function parseQuizGeneration(
  value: Json | null | undefined,
): QuizGenerationMeta | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, unknown>;
  const target =
    typeof o.target_count === "number" ? o.target_count : undefined;
  const ready = typeof o.ready === "boolean" ? o.ready : undefined;
  if (target == null || ready == null) return null;
  return { target_count: target, ready: ready };
}

export function quizGenerationJson(meta: QuizGenerationMeta): Json {
  return meta as unknown as Json;
}
