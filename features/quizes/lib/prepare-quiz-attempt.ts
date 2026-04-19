import { createHash } from "node:crypto";
import { createAdminClient } from "@/services/supabase/server";
import { insertQuiz } from "../dal/mutations";
import { getSkillQuizCache } from "../dal/quiz-cache";
import {
  parseQuizGeneration,
  QUIZ_TARGET_QUESTION_COUNT,
  quizGenerationJson,
} from "./quiz-generation-meta";
import { generateCertificationQuizBatch } from "@/services/ai/quizes";
import type { QuizQuestion } from "@/services/ai/quizes";
import { getSkillDescription } from "@/lib/constants";
import type { Json } from "@/services/supabase/types/database";

export type PreparedQuizForPage = {
  quizId: string;
  skillName: string;
  initialQuestions: QuizQuestion[];
  deferredQuestionLoad: boolean;
  expectedQuestionCount: number;
  /** Existing saved answers keyed by question index, if resuming an in-progress quiz. */
  initialAnswers: Record<number, number[]>;
};

function parseAnswers(raw: unknown): Record<number, number[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<number, number[]> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0) continue;
    if (!Array.isArray(val)) continue;
    const numeric = val.filter((v): v is number => typeof v === "number");
    if (numeric.length > 0) out[idx] = numeric;
  }
  return out;
}

/** Deterministic cache key for a skill-only quiz (name + description). */
export function skillQuizCacheKey(name: string, description?: string): string {
  const payload = `skill:${name}|${description ?? ""}`;
  return `skill:${createHash("sha256").update(payload).digest("hex")}`;
}

/**
 * Loads skill metadata, uses the cache when possible, otherwise inserts a quiz
 * with only the first batch (subsequent batches are streamed).
 *
 * Resumes an existing **incomplete** quiz for the same skill when one exists,
 * so reloads preserve questions, answers, and progress.
 */
export async function prepareQuizForSkillPage(params: {
  skillId: string;
  userId: string;
}): Promise<PreparedQuizForPage | null> {
  const { skillId, userId } = params;
  const supabase = await createAdminClient();

  const { data: skill, error: skillErr } = await supabase
    .from("skills")
    .select("*")
    .eq("id", skillId)
    .eq("user_id", userId)
    .maybeSingle();

  if (skillErr || !skill) return null;

  const { data: existing } = await supabase
    .from("quizes")
    .select("*")
    .eq("skill_id", skillId)
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const existingQuestionsRaw = existing.questions;
    if (Array.isArray(existingQuestionsRaw) && existingQuestionsRaw.length > 0) {
      const existingQuestions = existingQuestionsRaw as QuizQuestion[];
      const gen = parseQuizGeneration(existing.generation);
      const target =
        gen?.target_count ??
        Math.max(existingQuestions.length, QUIZ_TARGET_QUESTION_COUNT);
      return {
        quizId: existing.id,
        skillName: skill.name,
        initialQuestions: existingQuestions,
        deferredQuestionLoad: !!gen && gen.ready === false,
        expectedQuestionCount: target,
        initialAnswers: parseAnswers(existing.answers),
      };
    }
  }

  const description = getSkillDescription(skill.name);
  const cacheKey = skillQuizCacheKey(skill.name, description);

  const cached = await getSkillQuizCache(supabase, skillId, cacheKey);
  const cachedQs = cached?.questions;
  if (Array.isArray(cachedQs) && cachedQs.length >= QUIZ_TARGET_QUESTION_COUNT) {
    const initialQuestions = cachedQs.slice(
      0,
      QUIZ_TARGET_QUESTION_COUNT,
    ) as QuizQuestion[];
    const row = await insertQuiz({
      user_id: skill.user_id,
      skill_id: skillId,
      questions: initialQuestions as unknown as Json,
      total_questions: initialQuestions.length,
      generation: null,
    });
    return {
      quizId: row.id,
      skillName: skill.name,
      initialQuestions,
      deferredQuestionLoad: false,
      expectedQuestionCount: initialQuestions.length,
      initialAnswers: {},
    };
  }

  const first = await generateCertificationQuizBatch({
    certificationName: skill.name,
    source: { kind: "skill", description },
    batchRole: "foundations",
    avoidQuestionStems: [],
  });

  const row = await insertQuiz({
    user_id: skill.user_id,
    skill_id: skillId,
    questions: first as unknown as Json,
    total_questions: first.length,
    generation: quizGenerationJson({
      target_count: QUIZ_TARGET_QUESTION_COUNT,
      ready: false,
    }),
  });

  return {
    quizId: row.id,
    skillName: skill.name,
    initialQuestions: first,
    deferredQuestionLoad: true,
    expectedQuestionCount: QUIZ_TARGET_QUESTION_COUNT,
    initialAnswers: {},
  };
}
