"use server";

import { createAdminClient } from "@/services/supabase/server";
import { getSession } from "@/lib/get-session";

export type FeedbackCategory = "bug" | "rating" | "feature";

export type InsertFeedbackResult =
  | { ok: true }
  | { ok: false; code: "notAuthenticated" | "submitFailed"; message?: string };

export async function insertFeedback(params: {
  category: FeedbackCategory;
  message: string;
  rating: number | null;
  screenshotKey: string | null;
}): Promise<InsertFeedbackResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "notAuthenticated" };

  const supabase = await createAdminClient();

  const { error } = await supabase.from("feedbacks").insert({
    user_id: session.userId,
    role: session.role,
    category: params.category,
    message: params.message,
    rating: params.rating,
    screenshot_key: params.screenshotKey,
  });

  if (error) return { ok: false, code: "submitFailed", message: error.message };
  return { ok: true };
}
