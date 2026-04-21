"use server";

import {
  workerProfessionExperienceSchema,
  workerSchema,
  type WorkerUpsertWithPhotoValues,
} from "@/features/profile/schemas/worker";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";
import { getSession } from "@/lib/session";

const workerPayload = (data: z.infer<typeof workerSchema>) => ({
  first_name: data.firstName,
  last_name: data.lastName,
  date_of_birth: data.dateOfBirth,
  gender: data.gender,
  profession: data.profession,
  years_exp: data.yearsExp,
});

function workerRowPayload(data: WorkerUpsertWithPhotoValues) {
  return {
    ...workerPayload(data),
    photo_url: data.photoUrl,
  };
}

export async function upsertWorkerAction(data: WorkerUpsertWithPhotoValues) {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("workers")
      .update(workerRowPayload(data))
      .eq("user_id", userId);

    if (error) {
      return { error: true, message: error.message };
    }
    return { error: false, message: "Profile updated successfully" };
  }

  const { error } = await supabase.from("workers").insert({
    ...workerRowPayload(data),
    user_id: userId,
  });

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Profile saved successfully" };
}

export async function updateWorkerPhotoAction(photoUrl: string) {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("workers")
    .update({ photo_url: photoUrl })
    .eq("user_id", userId);

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

  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", userId)
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
    .eq("user_id", userId);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Profile updated successfully" };
}