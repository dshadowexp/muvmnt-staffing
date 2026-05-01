"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import { env } from "@/data/env/client";
import { rotateWorkerCalendarFeedToken } from "@/features/calendar/server/worker-calendar-feed";

export async function rotateWorkerCalendarFeedAction(): Promise<
  { ok: true; subscriptionUrl: string } | { ok: false; message: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Not authenticated" };

  const supabase = await createAdminClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!worker?.id) return { ok: false, message: "Worker profile not found" };

  try {
    const token = await rotateWorkerCalendarFeedToken(worker.id);
    const subscriptionUrl = `${env.NEXT_PUBLIC_APP_URL}/api/calendar/worker/${token}`;
    return { ok: true, subscriptionUrl };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
