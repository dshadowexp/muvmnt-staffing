import { createAdminClient } from "@/services/supabase/server";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function getQuizById(quizId: string, userId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("quizes")
    .select("*")
    .eq("id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

export async function getQuizForCurrentUser(quizId: string) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return getQuizById(quizId, session.userId);
}

export async function getQuizBySkillForUser(skillId: string, userId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("quizes")
    .select("*")
    .eq("skill_id", skillId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

export type LatestCompletedSkillQuiz = {
  passed: boolean;
  score: number | null;
  completedAt: string;
};

/**
 * For each skill id, the most recently **finished** quiz (by `completed_at`).
 */
export async function getLatestCompletedQuizBySkillIds(
  userId: string,
  skillIds: string[],
): Promise<Map<string, LatestCompletedSkillQuiz>> {
  const out = new Map<string, LatestCompletedSkillQuiz>();
  if (skillIds.length === 0) return out;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("quizes")
    .select("skill_id, passed, score, completed_at")
    .eq("user_id", userId)
    .in("skill_id", skillIds)
    .not("completed_at", "is", null);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  rows.sort(
    (a, b) =>
      new Date(b.completed_at as string).getTime() -
      new Date(a.completed_at as string).getTime(),
  );

  for (const row of rows) {
    const skillId = row.skill_id as string;
    if (out.has(skillId)) continue;
    out.set(skillId, {
      passed: row.passed === true,
      score: row.score,
      completedAt: row.completed_at as string,
    });
  }

  return out;
}
