import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";

export async function getClientProfile() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");

  const { userId } = session;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  if (data == null) return null;
  return data;
}

export async function getClients() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");
  
  const { role } = session;
  if (role !== "admin")
    throw new Error("Unauthorized");

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*");

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

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