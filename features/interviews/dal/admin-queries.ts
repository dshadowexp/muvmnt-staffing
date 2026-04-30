"use server";

// Admin-only interview queries (no user_id ownership check)

import { createAdminClient } from "@/services/supabase/server";
import { Json } from "@/services/supabase/types/database";

export type AdminInterviewRow = {
  id: string;
  user_id: string;
  worker_name: string | null;
  screening_id: string | null;
  subject_ref: Json | null;
  result: string | null;
  hume_chat_id: string | null;
  chat_group_id: string | null;
  reviewed: boolean;
  feedback_status: string | null;
  video_feedback_status: string | null;
  video_feedback: unknown;
  feedback: unknown;
  recording_url: string | null;
  duration: string | null;
  completed_at: string | null;
  created_at: string;
};

async function resolveWorkerNamesByUserId(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("workers")
    .select("user_id, first_name, last_name")
    .in("user_id", Array.from(new Set(userIds)));
  const map = new Map<string, string>();
  for (const w of data ?? []) {
    if (w.user_id) {
      map.set(w.user_id, `${w.first_name} ${w.last_name}`.trim());
    }
  }
  return map;
}

// List all completed interviews (completed_at IS NOT NULL), ordered by created_at desc
// Joined with workers table to get first_name + last_name as worker_name
export async function listAdminInterviews(): Promise<AdminInterviewRow[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("interviews")
    .select(
      "id, user_id, screening_id, result, reviewed, feedback_status, video_feedback_status, video_feedback, subject_ref, hume_chat_id, chat_group_id, feedback, recording_url, duration, completed_at, created_at",
    )
    .not("completed_at", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const workerNames = await resolveWorkerNamesByUserId(
    rows.map((r) => r.user_id),
  );

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    worker_name: workerNames.get(row.user_id) ?? null,
    screening_id: row.screening_id,
    subject_ref: row.subject_ref,
    hume_chat_id: row.hume_chat_id,
    chat_group_id: row.chat_group_id,
    result: row.result,

    reviewed: row.reviewed,
    feedback_status: (row as unknown as { feedback_status?: string | null }).feedback_status ?? null,
    video_feedback_status: row.video_feedback_status,
    video_feedback: row.video_feedback,
    feedback: row.feedback,
    recording_url: row.recording_url,
    duration: row.duration,
    completed_at: row.completed_at,
    created_at: row.created_at,
  }));
}

// Get single interview by id (for dialog detail)
export async function getAdminInterview(
  id: string,
): Promise<AdminInterviewRow | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("interviews")
    .select(
      "id, user_id, screening_id, result, reviewed, feedback_status, video_feedback_status, video_feedback, subject_ref, hume_chat_id, chat_group_id, feedback, recording_url, duration, completed_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const workerNames = await resolveWorkerNamesByUserId([data.user_id]);

  return {
    id: data.id,
    user_id: data.user_id,
    worker_name: workerNames.get(data.user_id) ?? null,
    screening_id: data.screening_id,
    subject_ref: data.subject_ref,
    hume_chat_id: data.hume_chat_id,
    chat_group_id: data.chat_group_id,
    result: data.result,
    reviewed: data.reviewed,
    feedback_status: (data as unknown as { feedback_status?: string | null }).feedback_status ?? null,
    video_feedback_status: data.video_feedback_status,
    video_feedback: data.video_feedback,
    feedback: data.feedback,
    recording_url: data.recording_url,
    duration: data.duration,
    completed_at: data.completed_at,
    created_at: data.created_at,
  };
}
