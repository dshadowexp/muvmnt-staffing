"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";

export async function upsertWorkAuthorizationAction(
  type: string,
  fileUrl: string
) {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };
  const { userId } = session;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("work_authorizations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("work_authorizations")
      .update({
        type,
        file_url: fileUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return { error: true, message: error.message };
    }
  } else {
    const { error } = await supabase.from("work_authorizations").insert({
      user_id: userId,
      type,
      file_url: fileUrl,
      is_verified: false,
    });

    if (error) {
      return { error: true, message: error.message };
    }
  }

  return { error: false, message: "Authorization saved successfully" };
}

export async function deleteWorkAuthorizationAction() {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("work_authorizations")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Work authorization removed" };
}
