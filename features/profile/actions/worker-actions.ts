"use server";

import {
  workerProfessionExperienceSchema,
  workerSchema,
  type WorkerProfileValues,
} from "@/features/profile/schemas/worker";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { normalizeProfessionId } from "@/lib/professions";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { env } from "@/data/env/server";

const workerPayload = (data: WorkerProfileValues) => ({
  first_name: data.firstName,
  last_name: data.lastName,
  date_of_birth: data.dateOfBirth,
  gender: data.gender,
  profession: normalizeProfessionId(data.profession),
  years_exp: data.yearsExp,
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
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  const { userId } = session;

  const supabase = await createAdminClient();

  // Fetch stage + name so we can conditionally advance stage and send an email.
  const { data: worker } = await supabase
    .from("workers")
    .select("stage, first_name")
    .eq("user_id", userId)
    .maybeSingle();

  const currentStage = worker?.stage ?? null;
  const isPictureStage = !currentStage || currentStage === "picture";

  // When the worker uploads their first photo (picture stage), advance them to
  // the interview stage so they can proceed with their assessments.
  const { error } = await supabase
    .from("workers")
    .update(
      isPictureStage
        ? { photo_url: photoUrl, stage: "interview" }
        : { photo_url: photoUrl },
    )
    .eq("user_id", userId);

  if (error) {
    return { error: true, message: error.message };
  }

  // Send "interviews ready" email only when transitioning out of picture stage.
  if (isPictureStage) {
    const firstName = worker?.first_name ?? "there";
    const assessmentsUrl = `${env.APP_URL}/dashboard/assessments`;

    enqueueNotification({
      userId,
      channels: [
        {
          channel: "email",
          subject: "Your profile is set — complete your interviews to continue",
          template: "interview-ready",
          data: { firstName, assessmentsUrl },
        },
      ],
    }).catch((err) => {
      console.error("[updateWorkerPhotoAction] enqueueNotification failed", err);
    });
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
      profession: normalizeProfessionId(parsed.data.profession),
      years_exp: parsed.data.yearsExp,
    })
    .eq("user_id", userId);

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, message: "Profile updated successfully" };
}