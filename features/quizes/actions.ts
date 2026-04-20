"use server";

import { createAdminClient } from "@/services/supabase/server";

// ─── Types matching the jsonb column shapes ───────────────────────────────────

export type QuestionRow = {
  id:          string;
  type:        "single" | "multi";
  question:    string;
  options:     { id: string; label: string }[];
  correctIds:  string[];
  explanation: string;
  difficulty:  "beginner" | "intermediate" | "advanced";
};

export type AnswerRow = {
  questionId:  string;
  selectedIds: string[];
  correct:     boolean;
  answeredAt:  string;
};

export type GenerationRow = {
  batchIndex:  number;
  generatedAt: string;
  questionIds: string[];
};

// ─── Create quiz attempt ──────────────────────────────────────────────────────
// CHANGED: row is created upfront (before any questions are generated) so we
// have a stable quizId to reference for every subsequent write.

export async function createQuizAttempt(params: {
  userId:  string;
  skillId: string;
}) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      user_id:          params.userId,
      skill_id:         params.skillId,
      questions:        [],
      answers:          [],
      generation:       [],
      total_questions:  10,
      score:            null,
      passed:           null,
      completed_at:     null,
      duration_seconds: 0,
      pass_threshold:   75,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

// ─── Append generated questions ───────────────────────────────────────────────
// CHANGED: called from onFinish() after each AI batch completes. Appends to
// both the questions[] and generation[] columns atomically via RPC.

export async function appendGeneratedQuestions(params: {
  quizId:     string;
  questions:  QuestionRow[];
  batchIndex: number;
}) {
  const supabase = await createAdminClient();

  const generationEvent: GenerationRow = {
    batchIndex:  params.batchIndex,
    generatedAt: new Date().toISOString(),
    questionIds: params.questions.map(q => q.id),
  };

  const { error } = await supabase.rpc("append_quiz_batch", {
    p_quiz_id:    params.quizId,
    p_questions:  params.questions,
    p_generation: generationEvent,
  });

  if (error) throw new Error(error.message);
}

// ─── Append a single answer ───────────────────────────────────────────────────
// CHANGED: called immediately after the user submits their answer (before they
// click Next). This means each answer is durable even if the tab closes.

export async function appendAnswer(params: {
  quizId: string;
  answer: Omit<AnswerRow, "answeredAt">;
}) {
  const supabase = await createAdminClient();

  const answerRow: AnswerRow = {
    ...params.answer,
    answeredAt: new Date().toISOString(),
  };

  const { error } = await supabase.rpc("append_quiz_answer", {
    p_quiz_id: params.quizId,
    p_answer:  answerRow,
  });

  if (error) throw new Error(error.message);
}

// ─── Sync duration ────────────────────────────────────────────────────────────
// CHANGED: called every 10 seconds from the client while the quiz is active.
// Lightweight write — only touches duration_seconds + updated_at.

export async function syncQuizDuration(params: {
  quizId:          string;
  durationSeconds: number;
}) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("quizzes")
    .update({ duration_seconds: params.durationSeconds })
    .eq("id", params.quizId);

  if (error) throw new Error(error.message);
}

// ─── Finalize quiz ────────────────────────────────────────────────────────────
// CHANGED: called once from finishQuiz() — writes final score, pass/fail,
// completed_at, and duration atomically. Called whether the user completes
// all questions or the 15-minute timer expires.

export async function finalizeQuiz(params: {
  quizId:          string;
  score:           number;
  passed:          boolean;
  durationSeconds: number;
  totalAnswered:   number;
}) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("quizzes")
    .update({
      score:            params.score,
      passed:           params.passed,
      completed_at:     new Date().toISOString(),
      duration_seconds: params.durationSeconds,
      total_questions:  params.totalAnswered,
    })
    .eq("id", params.quizId);

  if (error) throw new Error(error.message);
}