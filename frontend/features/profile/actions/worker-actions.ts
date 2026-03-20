"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { workerSchema } from "@/features/profile/schemas/worker";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";

const workerPayload = (data: z.infer<typeof workerSchema>) => ({
  first_name: data.firstName,
  last_name: data.lastName,
  date_of_birth: data.dateOfBirth,
  profession: data.profession,
  years_exp: data.yearsExp,
});

export async function upsertWorkerAction(data: z.infer<typeof workerSchema>) {

  const { user } = await getCurrentUser({ allData: true });
  if (user == null) {
    return { error: true, message: "User not authenticated" };
  }

  const userId = user.id;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("workers")
      .update(workerPayload(data))
      .eq("user_id", userId);

    if (error) {
      return { error: true, message: error.message };
    }
    return { error: false, message: "Profile updated successfully" };
  }

  const { error } = await supabase.from("workers").insert({
    ...workerPayload(data),
    user_id: userId,
  });

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Profile saved successfully" };
}