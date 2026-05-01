"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import {
  skillsSchema,
  type SkillsFormValues,
} from "@/features/profile/schemas/skills";

/**
 * Upsert a skill for the signed-in worker. Skills are assessed via AI-generated
 * quizes; supporting documents (e.g. certification PDFs) live in the
 * `compliances` table and are handled separately.
 */
export async function saveSkillAction(name: string) {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("skills")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("skills")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      return { error: true, message: error.message };
    }
  } else {
    const { error } = await supabase.from("skills").insert({
      user_id: userId,
      name,
    });

    if (error) {
      return { error: true, message: error.message };
    }
  }

  return {
    error: false,
    message: "Skill added — take the quiz to verify it",
  };
}

export async function deleteSkillAction(name: string) {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("skills")
    .delete()
    .eq("user_id", userId)
    .eq("name", name);

  if (error) {
    return { error: true, message: error.message };
  }

  return { error: false, message: "Skill removed" };
}

export async function saveSkillsAction(data: SkillsFormValues) {
  const parsed = skillsSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: true,
      message: first?.message ?? "Invalid skill data",
    };
  }

  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { error: deleteError } = await supabase
    .from("skills")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    return { error: true, message: deleteError.message };
  }

  const { skills } = parsed.data;
  if (skills.length === 0) {
    return { error: false, message: "Skills saved successfully" };
  }

  const { error: insertError } = await supabase.from("skills").insert(
    skills.map((s) => ({
      user_id: userId,
      name: s.name,
    })),
  );

  if (insertError) {
    return { error: true, message: insertError.message };
  }

  return { error: false, message: "Skills saved successfully" };
}
