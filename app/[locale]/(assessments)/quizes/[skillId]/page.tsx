import { notFound } from "next/navigation";
import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { getSkillById } from "@/features/profile/dal/queries";
import { QuizClientPage } from "@/features/quizes/components/quiz-page";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

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
          <CircleDashedIcon className="size-16 animate-spin" />
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
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  if (session.role !== "worker") return redirect({ href: "/dashboard", locale });

  const skill = await getSkillById(skillId, session.userId);
  if (!skill) return notFound();

  const tSkills = await getTranslations("skills");
  const tSkillsDesc = await getTranslations("skillsDesc");

  return (
    <QuizClientPage
      userId={session.userId}
      skillId={skill.id}
      skillName={tSkills(skill.name)}
      skillDescription={tSkillsDesc(skill.name)}
    />
  );
}
