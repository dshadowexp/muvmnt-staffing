import { getSkills, getWorkerProfile } from "@/features/profile/dal/queries";
import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { getLatestCompletedQuizBySkillIds } from "@/features/quizes/dal/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  WorkerAssessmentsHub,
  type AssessmentSkillRow,
  type CompletedInterview,
} from "./_client";

export default async function WorkerAssessmentsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "worker") redirect("/app");

  const worker = await getWorkerProfile();
  if (!worker) redirect("/onboarding/profile");

  const userId = session.userId;

  const professionInterviewPromise: Promise<CompletedInterview | null> =
    getInterviewBySubjectForUser("profession", userId).then((i) =>
      i
        ? {
            id: i.id,
            subject: "profession" as const,
            feedback: i.feedback,
            duration: i.duration,
            completedAt: i.completed_at,
          }
        : null,
    );
  professionInterviewPromise.catch(() => undefined);

  const resumeInterviewPromise: Promise<CompletedInterview | null> =
    getInterviewBySubjectForUser("resume", userId).then((i) =>
      i
        ? {
            id: i.id,
            subject: "resume" as const,
            feedback: i.feedback,
            duration: i.duration,
            completedAt: i.completed_at,
          }
        : null,
    );
  resumeInterviewPromise.catch(() => undefined);

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
        professionInterviewPromise={professionInterviewPromise}
        resumeInterviewPromise={resumeInterviewPromise}
        skillsPromise={skillsPromise}
      />
    </div>
  );
}
