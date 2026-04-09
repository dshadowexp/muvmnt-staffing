"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import {
  workerProfessionExperienceSchema,
  workerSchema,
} from "@/features/profile/schemas/worker";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";

const workerPayload = (data: z.infer<typeof workerSchema>) => ({
  first_name: data.firstName,
  last_name: data.lastName,
  date_of_birth: data.dateOfBirth,
  gender: data.gender,
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

export async function updateWorkerPhotoAction(photoUrl: string) {
  const { user } = await getCurrentUser({ allData: true });
  if (user == null) {
    return { error: true, message: "User not authenticated" };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("workers")
    .update({ photo_url: photoUrl })
    .eq("user_id", user.id);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Photo updated successfully" };
}

export async function updateWorkerProfessionAndExperienceAction(
  data: z.infer<typeof workerProfessionExperienceSchema>,
) {
  const parsed = workerProfessionExperienceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: true, message: parsed.error.message };
  }

  const { user } = await getCurrentUser({ allData: true });
  if (user == null) {
    return { error: true, message: "User not authenticated" };
  }

  const supabase = await createAdminClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return { error: true, message: fetchErr.message };
  }
  if (!existing) {
    return { error: true, message: "Worker profile not found" };
  }

  const { error } = await supabase
    .from("workers")
    .update({
      profession: parsed.data.profession,
      years_exp: parsed.data.yearsExp,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Profile updated successfully" };
}