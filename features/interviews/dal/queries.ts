import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";
import { redirect } from "next/navigation";

export type InterviewRow = Database["public"]["Tables"]["interviews"]["Row"];

export async function countInterviewsForUser(userId: string): Promise<number> {
  const supabase = await createAdminClient();
  const { count, error } = await supabase
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getInterviewByIdForUser(
  interviewId: string,
  userId: string,
): Promise<InterviewRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

export async function listInterviewsForUser(
  userId: string,
): Promise<InterviewRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Worker interview: at most one row per user with screening_id IS NULL.
 */
export async function getWorkerInterviewForUser(
  userId: string,
): Promise<InterviewRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .is("screening_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

/** Lists interviews for the signed-in user (any role). */
export async function getInterviewsForCurrentUser(): Promise<InterviewRow[]> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return listInterviewsForUser(session.userId);
}

/** Single interview row if it belongs to the signed-in user. */
export async function getInterviewForCurrentUser(
  id: string,
): Promise<InterviewRow | null> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return getInterviewByIdForUser(id, session.userId);
}
