import { redirect, notFound } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { prepareQuizForSkillPage } from "@/features/quizes/lib/prepare-quiz-attempt";
import { QuizClient } from "./_quiz-client";
import type { QuizQuestion } from "@/services/ai/quizes";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh flex-col items-center justify-center gap-4">
          <Loader2Icon className="size-16 animate-spin" />
          <p className="text-muted-foreground">
            Preparing your assessment…
          </p>
          <p className="text-xs text-muted-foreground">
            First questions load quickly; the rest load in the background when
            needed.
          </p>
        </div>
      }
    >
      <SuspendedContent skillId={skillId} />
    </Suspense>
  );
}

async function SuspendedContent({ skillId }: { skillId: string }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "worker") redirect("/worker");

  const prepared = await prepareQuizForSkillPage({
    skillId,
    userId: session.userId,
  });

  if (!prepared) return notFound();

  return (
    <QuizClient
      quizId={prepared.quizId}
      questions={prepared.initialQuestions as QuizQuestion[]}
      skillName={prepared.skillName}
      deferredQuestionLoad={prepared.deferredQuestionLoad}
      expectedQuestionCount={prepared.expectedQuestionCount}
      initialAnswers={prepared.initialAnswers}
    />
  );
}
