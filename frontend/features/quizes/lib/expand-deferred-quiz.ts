import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/services/supabase/types/database";
import {
  dedupeQuizQuestions,
  generateCertificationQuizBatch,
  generateCertificationQuizTopUp,
  type QuizQuestion,
} from "@/services/ai/quizes";
import { updateQuizByOwner } from "../dal/mutations";
import { upsertSkillQuizCache } from "../dal/quiz-cache";
import {
  parseQuizGeneration,
  quizGenerationJson,
  QUIZ_TARGET_QUESTION_COUNT,
} from "./quiz-generation-meta";
import { skillQuizCacheKey } from "./prepare-quiz-attempt";
import { getSkillDescription } from "@/lib/constants";

function stemsFromQuestions(qs: QuizQuestion[]): string[] {
  return qs.map((q) => q.question);
}

export async function expandDeferredQuizQuestions(params: {
  supabase: SupabaseClient<Database>;
  quizId: string;
  userId: string;
}): Promise<
  | { ok: true; questions: QuizQuestion[] }
  | { ok: false; message: string }
> {
  const { supabase, quizId, userId } = params;

  const { data: quiz, error: qErr } = await supabase
    .from("quizes")
    .select("*")
    .eq("id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  if (qErr) return { ok: false, message: qErr.message };
  if (!quiz) return { ok: false, message: "Quiz not found" };

  const gen = parseQuizGeneration(quiz.generation);
  const existing = quiz.questions as QuizQuestion[];
  if (!Array.isArray(existing) || existing.length === 0) {
    return { ok: false, message: "Invalid quiz data" };
  }

  if (!gen || gen.ready) {
    return { ok: true, questions: existing };
  }

  const { data: skill, error: sErr } = await supabase
    .from("skills")
    .select("*")
    .eq("id", quiz.skill_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (sErr || !skill) {
    return { ok: false, message: "Skill not found" };
  }

  const description = getSkillDescription(skill.name);
  const cacheKey = skillQuizCacheKey(skill.name, description);
  const source = { kind: "skill", description } as const;

  const stems = stemsFromQuestions(existing);

  const [b1, b2] = await Promise.all([
    generateCertificationQuizBatch({
      certificationName: skill.name,
      source,
      batchRole: "safety_compliance",
      avoidQuestionStems: stems,
    }),
    generateCertificationQuizBatch({
      certificationName: skill.name,
      source,
      batchRole: "scenarios",
      avoidQuestionStems: stems,
    }),
  ]);

  let merged = dedupeQuizQuestions([...existing, ...b1, ...b2]);
  let avoid = stemsFromQuestions(merged);

  for (
    let safety = 0;
    safety < 4 && merged.length < QUIZ_TARGET_QUESTION_COUNT;
    safety++
  ) {
    const need = QUIZ_TARGET_QUESTION_COUNT - merged.length;
    const extra = await generateCertificationQuizTopUp({
      certificationName: skill.name,
      source,
      count: need,
      avoidQuestionStems: avoid,
    });
    if (extra.length === 0) break;
    merged = dedupeQuizQuestions([...merged, ...extra]);
    avoid = stemsFromQuestions(merged);
  }

  if (merged.length < QUIZ_TARGET_QUESTION_COUNT) {
    return {
      ok: false,
      message: "Could not generate enough distinct questions. Please try again.",
    };
  }

  const finalQuestions = merged.slice(0, QUIZ_TARGET_QUESTION_COUNT);

  const updated = await updateQuizByOwner(quizId, userId, {
    questions: finalQuestions as unknown as Json,
    total_questions: finalQuestions.length,
    generation: quizGenerationJson({
      target_count: QUIZ_TARGET_QUESTION_COUNT,
      ready: true,
    }),
  });

  if (!updated) {
    return { ok: false, message: "Failed to save expanded quiz" };
  }

  await upsertSkillQuizCache(supabase, {
    skill_id: quiz.skill_id,
    generation_hash: cacheKey,
    questions: finalQuestions,
  });

  return { ok: true, questions: finalQuestions };
}
