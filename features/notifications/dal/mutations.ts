"use server";

import { createAdminClient } from "@/services/supabase/server";
import { getSession } from "@/lib/get-session";

export async function upsertPushToken(token: string) {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" } as const;

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ push_token: token })
    .eq("id", session.userId);

  if (error) return { error: true, message: error.message } as const;
  return { error: false, message: "Push token saved" } as const;
}

export async function deletePushToken() {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" } as const;

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ push_token: null })
    .eq("id", session.userId);

  if (error) return { error: true, message: error.message } as const;
  return { error: false, message: "Push token removed" } as const;
}
