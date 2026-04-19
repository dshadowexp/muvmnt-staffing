import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import {
  dedupeQuizQuestions,
  generateCertificationQuizTopUp,
  type QuizQuestion,
} from "@/services/ai/quizes";
import { updateQuizByOwner } from "@/features/quizes/dal/mutations";
import { upsertSkillQuizCache } from "@/features/quizes/dal/quiz-cache";
import {
  parseQuizGeneration,
  quizGenerationJson,
  QUIZ_TARGET_QUESTION_COUNT,
} from "@/features/quizes/lib/quiz-generation-meta";
import { skillQuizCacheKey } from "@/features/quizes/lib/prepare-quiz-attempt";
import { getSkillDescription } from "@/lib/constants";
import type { Json } from "@/services/supabase/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamMessage =
  | { type: "ready"; questions: QuizQuestion[]; target: number }
  | { type: "batch"; questions: QuizQuestion[] }
  | { type: "done" }
  | { type: "error"; message: string };

const SAFETY_LIMIT = 20;

/**
 * POST /api/ai/quizes/[quizId]/stream
 *
 * NDJSON stream: one JSON object per line. Client appends `batch` questions
 * until `done`. Each batch contains 1–2 newly-distinct questions; when fewer
 * than 2 remain to reach target, a final batch of 1 is emitted.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const userId = session.userId;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (msg: StreamMessage) => {
        controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));
      };

      try {
        const supabase = await createAdminClient();

        const { data: quiz, error: qErr } = await supabase
          .from("quizes")
          .select("*")
          .eq("id", quizId)
          .eq("user_id", userId)
          .maybeSingle();

        if (qErr || !quiz) {
          write({ type: "error", message: qErr?.message ?? "Quiz not found" });
          controller.close();
          return;
        }

        const existingRaw = quiz.questions;
        if (!Array.isArray(existingRaw)) {
          write({ type: "error", message: "Invalid quiz data" });
          controller.close();
          return;
        }
        let accumulated = existingRaw as QuizQuestion[];

        const gen = parseQuizGeneration(quiz.generation);
        const target = gen?.target_count ?? QUIZ_TARGET_QUESTION_COUNT;

        write({ type: "ready", questions: accumulated, target });

        if (!gen || gen.ready || accumulated.length >= target) {
          write({ type: "done" });
          controller.close();
          return;
        }

        const { data: skill, error: sErr } = await supabase
          .from("skills")
          .select("*")
          .eq("id", quiz.skill_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (sErr || !skill) {
          write({ type: "error", message: "Skill not found" });
          controller.close();
          return;
        }

        const description = getSkillDescription(skill.name);
        const cacheKey = skillQuizCacheKey(skill.name, description);

        let safety = 0;
        while (accumulated.length < target && safety < SAFETY_LIMIT) {
          safety++;
          const remaining = target - accumulated.length;
          const count = Math.min(2, remaining);
          const stems = accumulated.map((q) => q.question);

          let rawBatch: QuizQuestion[];
          try {
            rawBatch = await generateCertificationQuizTopUp({
              certificationName: skill.name,
              source: { kind: "skill", description },
              count,
              avoidQuestionStems: stems,
            });
          } catch (e) {
            write({
              type: "error",
              message: e instanceof Error ? e.message : "Generation failed",
            });
            controller.close();
            return;
          }

          const merged = dedupeQuizQuestions([...accumulated, ...rawBatch]);
          const added = merged.slice(
            accumulated.length,
            accumulated.length + count,
          );

          if (added.length === 0) {
            continue;
          }
          accumulated = merged.slice(0, accumulated.length + added.length);

          const isDone = accumulated.length >= target;
          try {
            await updateQuizByOwner(quizId, userId, {
              questions: accumulated as unknown as Json,
              total_questions: accumulated.length,
              generation: quizGenerationJson({
                target_count: target,
                ready: isDone,
              }),
            });
          } catch (e) {
            write({
              type: "error",
              message:
                e instanceof Error ? e.message : "Failed to persist quiz batch",
            });
            controller.close();
            return;
          }

          write({ type: "batch", questions: added });
        }

        if (accumulated.length < target) {
          write({
            type: "error",
            message: "Could not generate enough distinct questions",
          });
          controller.close();
          return;
        }

        try {
          await upsertSkillQuizCache(supabase, {
            skill_id: quiz.skill_id,
            generation_hash: cacheKey,
            questions: accumulated,
          });
        } catch {
          // Cache is best-effort; ignore.
        }

        write({ type: "done" });
        controller.close();
      } catch (e) {
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                message: e instanceof Error ? e.message : "Unexpected error",
              } satisfies StreamMessage) + "\n",
            ),
          );
        } catch {
          // If the controller is already closed, just swallow.
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
