import { getSkills, getWorkerProfile } from "@/features/profile/dal/queries";
import { getWorkerInterviewForUser } from "@/features/interviews/dal/queries";
import { getLatestCompletedQuizBySkillIds } from "@/features/quizes/dal/queries";
import { getSession } from "@/lib/get-session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import {
  WorkerAssessmentsHub,
  type AssessmentSkillRow,
  type StartedInterview,
} from "./_client";

export default async function WorkerAssessmentsPage() {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });
  if (session.role !== "worker") return redirect({ href: "/dashboard", locale });

  const worker = await getWorkerProfile();
  if (!worker) return redirect({ href: "/onboarding/profile", locale });

  const userId = session.userId;

  const combinedInterviewPromise: Promise<StartedInterview | null> =
    getWorkerInterviewForUser(userId).then((i) =>
      i
        ? {
            id: i.id,
            feedback: i.feedback,
            result: i.result,
            duration: i.duration,
            completedAt: i.completed_at,
            reviewed: i.reviewed,
          }
        : null,
    );
  combinedInterviewPromise.catch(() => undefined);

  const skillsPromise: Promise<AssessmentSkillRow[]> = (async () => {
    const rows = await getSkills();
    if (rows.length === 0) return [];
    const latest = await getLatestCompletedQuizBySkillIds(
      userId,
      rows.map((s) => s.id),
    );
    return rows.map((s) => {
      const q = latest.get(s.id);
      return {
        id: s.id,
        name: s.name,
        assessed: s.assessed === true,
        latestQuiz: q
          ? {
              passed: q.passed,
              score: q.score,
              completedAt: q.completedAt,
            }
          : null,
      };
    });
  })();
  skillsPromise.catch(() => undefined);

  return (
    <div className="flex w-full flex-col">
      <WorkerAssessmentsHub
        profession={worker.profession ?? ""}
        hasPhoto={Boolean(worker.photo_url)}
        combinedInterviewPromise={combinedInterviewPromise}
        skillsPromise={skillsPromise}
      />
    </div>
  );
}
