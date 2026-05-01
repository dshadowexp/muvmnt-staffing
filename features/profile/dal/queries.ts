import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import { redirect } from "next/navigation";

export async function getFacilityProfile() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { facilityId } = session;
  if (!facilityId) return null;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", facilityId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

/** @deprecated Use getFacilityProfile */
export const getClientProfile = getFacilityProfile;

export async function getFacilities() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { role } = session;
  if (role !== "admin") throw new Error("Unauthorized");

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from("facilities").select("*");

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

/** @deprecated Use getFacilities */
export const getClients = getFacilities;

export async function getWorkerProfile() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  if (data == null) return null;
  return data;
}

/** Skills a worker has claimed (quiz-assessed). */
export async function getSkills() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Fetch a single skill by id, scoped to the owning user so a worker can't
 * read another user's skill row. Returns `null` when not found.
 */
export async function getSkillById(skillId: string, userId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("id", skillId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

/** Compliance documents (admin-verified, with file_url / is_verified). */
export async function getCompliances() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("compliances")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getIdentityVerification() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("identity_verification")
    .select("verified, verified_at, session_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkAuthorization() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("work_authorizations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}