"use server";

import {
  workerProfessionExperienceSchema,
  type WorkerProfileValues,
} from "@/features/profile/schemas/worker";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { normalizeProfessionId } from "@/lib/professions";
import { toAddressJson } from "@/features/geo/lib/build-address-location";
import { syncWorkerCellId } from "@/features/geo/dal/mutations";

const workerPayload = (data: WorkerProfileValues) => ({
  first_name:    data.firstName,
  last_name:     data.lastName,
  date_of_birth: data.dateOfBirth,
  gender:        data.gender,
  profession:    normalizeProfessionId(data.profession),
  years_exp:     data.yearsExp,
  address:       data.address ? toAddressJson(data.address) : null,
});

export async function upsertWorkerAction(data: WorkerProfileValues) {
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
      .update(workerPayload(data))
      .eq("user_id", userId);

    if (error) return { error: true, message: error.message };
  } else {
    const { error } = await supabase.from("workers").insert({
      ...workerPayload(data),
      user_id: userId,
    });

    if (error) return { error: true, message: error.message };
  }

  // Sync H3 cell index so the shift matcher sees the worker's region
  if (data.address?.lat && data.address?.lng) {
    await syncWorkerCellId(userId, data.address.lat, data.address.lng);
  }

  return { error: false, message: existing ? "Profile updated successfully" : "Profile saved successfully" };
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

  if (error) return { error: true, message: error.message };
  return { error: false, message: "Photo updated successfully" };
}

export async function updateWorkerProfessionAndExperienceAction(
  data: z.infer<typeof workerProfessionExperienceSchema>,
) {
  const parsed = workerProfessionExperienceSchema.safeParse(data);
  if (!parsed.success) return { error: true, message: parsed.error.message };

  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) return { error: true, message: fetchErr.message };
  if (!existing)  return { error: true, message: "Worker profile not found" };

  const { error } = await supabase
    .from("workers")
    .update({
      profession: normalizeProfessionId(parsed.data.profession),
      years_exp:  parsed.data.yearsExp,
    })
    .eq("user_id", userId);

  if (error) return { error: true, message: error.message };
  return { error: false, message: "Profile updated successfully" };
}
