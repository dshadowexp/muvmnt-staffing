"use server";

import { insertFeedback, type FeedbackCategory } from "./dal/mutations";

const VALID_CATEGORIES = new Set<FeedbackCategory>(["bug", "rating", "feature"]);

export type SubmitFeedbackActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "messageRequired" | "invalidCategory" | "notAuthenticated" | "submitFailed";
      message?: string;
    };

export async function submitFeedbackAction(params: {
  category: string;
  message: string;
  rating: number | null;
  screenshotKey: string | null;
}): Promise<SubmitFeedbackActionResult> {
  if (!params.message.trim()) {
    return { ok: false, code: "messageRequired" };
  }
  if (!VALID_CATEGORIES.has(params.category as FeedbackCategory)) {
    return { ok: false, code: "invalidCategory" };
  }

  const res = await insertFeedback({
    category: params.category as FeedbackCategory,
    message: params.message.trim(),
    rating: params.category === "rating" ? params.rating : null,
    screenshotKey: params.screenshotKey,
  });

  if (!res.ok) {
    return {
      ok: false,
      code: res.code === "notAuthenticated" ? "notAuthenticated" : "submitFailed",
      message: res.message,
    };
  }
  return { ok: true };
}
