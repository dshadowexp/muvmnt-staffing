"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { clientSchema } from "@/features/profile/schemas/client";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";

const clientPayload = (data: z.infer<typeof clientSchema>) => ({
  name: data.name,
  type: data.type,
});

export async function createClientAction(data: z.infer<typeof clientSchema>) {
  const { user } = await getCurrentUser({ allData: true });
  if (user == null) {
    return { error: true, message: "User not authenticated" };
  }

  const userId = user.id;
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