import { redirect, notFound } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("assessments.quiz");

  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh flex-col items-center justify-center gap-4">
          <Loader2Icon className="size-16 animate-spin" />
          <p className="text-muted-foreground">{t("preparingTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("preparingHint")}</p>
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
