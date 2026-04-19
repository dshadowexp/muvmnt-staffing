"use server";

import { getSession } from "@/lib/session";
import { clientSchema } from "@/features/account/schemas/client";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";

const clientPayload = (data: z.infer<typeof clientSchema>) => ({
  name: data.name,
  type: data.type,
});

export async function createClientAction(data: z.infer<typeof clientSchema>) {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("clients")
      .update(clientPayload(data))
      .eq("user_id", userId);

    if (error) {
      return { error: true, message: error.message };
    }
    return { error: false, message: "Profile updated successfully" };
  }

  const { error } = await supabase.from("clients").insert({
    ...clientPayload(data),
    user_id: userId,
  });

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Profile saved successfully" };
}

/** Same as {@link createClientAction}; use on account settings pages. */
export const updateClientProfileAction = createClientAction;