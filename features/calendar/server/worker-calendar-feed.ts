import "server-only";

import { randomBytes } from "node:crypto";

import { createAdminClient } from "@/supabase/server";

import type { IcsShiftRow } from "@/features/calendar/build-worker-ics";

export async function ensureWorkerCalendarFeedToken(workerId: string): Promise<string> {
  const supabase = await createAdminClient();
  const { data: row } = await supabase
    .from("workers")
    .select("calendar_token")
    .eq("id", workerId)
    .maybeSingle();

  if (row?.calendar_token) return row.calendar_token;

  const token = randomBytes(32).toString("hex");
  const { data: updated, error } = await supabase
    .from("workers")
    .update({ calendar_token: token })
    .eq("id", workerId)
    .is("calendar_token", null)
    .select("calendar_token")
    .maybeSingle();

  if (updated?.calendar_token) return updated.calendar_token;

  if (error) throw new Error(error.message);

  const { data: again } = await supabase
    .from("workers")
    .select("calendar_token")
    .eq("id", workerId)
    .maybeSingle();
  if (again?.calendar_token) return again.calendar_token;

  throw new Error("Could not assign calendar token");
}

export async function rotateWorkerCalendarFeedToken(workerId: string): Promise<string> {
  const supabase = await createAdminClient();
  const token = randomBytes(32).toString("hex");
  const { error } = await supabase
    .from("workers")
    .update({ calendar_token: token })
    .eq("id", workerId);
  if (error) throw new Error(error.message);
  return token;
}

export async function getWorkerIdByCalendarToken(token: string): Promise<string | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("workers")
    .select("id")
    .eq("calendar_token", token)
    .maybeSingle();
  return data?.id ?? null;
}

export async function listShiftsForWorkerCalendarFeed(workerId: string): Promise<IcsShiftRow[]> {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("shifts")
    .select("id, start_time, end_time, status, location, facilities ( name )")
    .eq("worker_id", workerId)
    .not("status", "in", '("cancelled","canceled","declined")')
    .gt("end_time", now)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as unknown as IcsShiftRow[];
}
