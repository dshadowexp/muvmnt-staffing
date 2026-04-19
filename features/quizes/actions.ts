"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { prepareQuizForSkillPage } from "./lib/prepare-quiz-attempt";
import { expandDeferredQuizQuestions } from "./lib/expand-deferred-quiz";
import { updateQuizByOwner } from "./dal/mutations";
import { parseQuizGeneration } from "./lib/quiz-generation-meta";
import type { QuizQuestion } from "@/services/ai/quizes";
import type { Json } from "@/services/supabase/types/database";

export async function startQuiz({
  skillId,
}: {
  skillId: string;
}): Promise<
  { error: true; message: string } | { error: false; quizId: string }
> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  try {
    const prepared = await prepareQuizForSkillPage({
      skillId,
      userId: session.userId,
    });
    if (!prepared) {
      return { error: true, message: "Skill not found" };
    }
    return { error: false, quizId: prepared.quizId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to start quiz";
    return { error: true, message };
  }
}

export async function completeDeferredQuizQuestions(
  quizId: string,
): Promise<
  | { error: true; message: string }
  | { error: false; questions: QuizQuestion[] }
> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  const supabase = await createAdminClient();
  const result = await expandDeferredQuizQuestions({
    supabase,
    quizId,
    userId: session.userId,
  });

  if (!result.ok) {
    return { error: true, message: result.message };
  }
  return { error: false, questions: result.questions };
}

/**
 * Persists in-progress answers so a page reload can resume exactly where the
 * worker left off. Does not alter `completed_at`, score, or generation flags.
 */
export async function saveQuizProgress({
  quizId,
  answers,
}: {
  quizId: string;
  answers: Record<number, number[]>;
}): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  const supabase = await createAdminClient();
  const { data: quiz, error } = await supabase
    .from("quizes")
    .select("id, completed_at")
    .eq("id", quizId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) return { error: true, message: error.message };
  if (!quiz) return { error: true, message: "Quiz not found" };
  if (quiz.completed_at) return { error: false };

  await updateQuizByOwner(quizId, session.userId, {
    answers: answers as unknown as Json,
  });

  return { error: false };
}

export async function submitQuiz({
  quizId,
  answers,
}: {
  quizId: string;
  answers: Record<number, number[]>;
}): Promise<
  | { error: true; message: string }
  | { error: false; score: number; passed: boolean; total: number }
> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  const supabase = await createAdminClient();
  const { data: quiz, error: qErr } = await supabase
    .from("quizes")
    .select("*")
    .eq("id", quizId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (qErr) return { error: true, message: qErr.message };
  if (!quiz) return { error: true, message: "Quiz not found" };

  const gen = parseQuizGeneration(quiz.generation);
  if (gen && !gen.ready) {
    return {
      error: true,
      message: "Questions are still loading. Please wait a moment and try again.",
    };
  }

  const questions = quiz.questions as Array<{
    correctAnswers: number[];
  }>;
  const total = questions.length;

  if (total === 0) {
    return { error: true, message: "Quiz has no questions" };
  }

  let correct = 0;
  for (let i = 0; i < total; i++) {
    const expected = questions[i].correctAnswers.sort();
    const given = (answers[i] ?? []).sort();
    if (
      expected.length === given.length &&
      expected.every((v, idx) => v === given[idx])
    ) {
      correct++;
    }
  }

  const score = Math.round((correct / total) * 100);
  const passed = score >= 70;

  await updateQuizByOwner(quizId, session.userId, {
    answers: answers as unknown as Json,
    score,
    passed,
    completed_at: new Date().toISOString(),
  });

  if (passed && quiz.skill_id) {
    await supabase
      .from("skills")
      .update({ assessed: true })
      .eq("id", quiz.skill_id)
      .eq("user_id", session.userId);
  }

  return { error: false, score, passed, total };
}
