import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import {
  defaultWeekSchedule,
  type WeekAvailabilityState,
  weekStateFromRows,
} from "../lib/week-state";

export type WorkerAvailabilityInitial = {
  timezone: string;
  week: WeekAvailabilityState;
  autoConfirm: boolean;
};

export async function getWorkerAvailabilityInitial(): Promise<WorkerAvailabilityInitial | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createAdminClient();
  const userId = session.userId;

  const [{ data: rows, error: aErr }, { data: worker, error: wErr }] =
    await Promise.all([
      supabase
        .from("availability")
        .select("day_of_week, start_time, end_time")
        .eq("user_id", userId)
        .order("day_of_week", { ascending: true }),
      supabase
        .from("workers")
        .select("availability_timezone, auto_confirm")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (aErr) throw new Error(aErr.message);
  if (wErr && wErr.code !== "PGRST116") throw new Error(wErr.message);

  const hasRows = rows != null && rows.length > 0;
  const week = hasRows
    ? weekStateFromRows(rows)
    : defaultWeekSchedule();

  const timezone =
    worker?.availability_timezone?.trim() || "America/Toronto";

  return { timezone, week, autoConfirm: worker?.auto_confirm ?? false };
}
