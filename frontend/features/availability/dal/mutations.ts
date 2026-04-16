import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { toDbTime } from "../lib/week-state";
import type { AvailabilityOnboardingPayload } from "../schema";

export async function saveWorkerAvailabilityBundle(
  payload: AvailabilityOnboardingPayload,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };

  const userId = session.userId;
  const supabase = await createAdminClient();

  const { error: delErr } = await supabase
    .from("availability")
    .delete()
    .eq("user_id", userId);

  if (delErr) return { error: true, message: delErr.message };

  const inserts: {
    user_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[] = [];

  for (const [key, day] of Object.entries(payload.week)) {
    const dow = Number(key);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
    if (!day.enabled) continue;
    for (const slot of day.slots) {
      inserts.push({
        user_id: userId,
        day_of_week: dow,
        start_time: toDbTime(slot.start),
        end_time: toDbTime(slot.end),
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("availability").insert(inserts);
    if (insErr) return { error: true, message: insErr.message };
  }

  const { error: wErr } = await supabase
    .from("workers")
    .update({
      availability_timezone: payload.timezone,
    })
    .eq("user_id", userId);

  if (wErr) return { error: true, message: wErr.message };

  return { error: false };
}
