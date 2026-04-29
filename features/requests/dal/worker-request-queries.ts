import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import type { Tables } from "@/services/supabase/types/database";
import { parseSiteRowFromStaffRequestLocation } from "../lib/staff-request-location-json";

export type StaffRequestSiteRow = {
  address: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  admin_area: string | null;
  postal_code: string | null;
  country_code: string | null;
  instructions: string | null;
};

/** Worker-visible slice of a staff request (no client pricing tier / rate on the page). */
export type WorkerStaffRequestSummary = Pick<
  Tables<"staff_requests">,
  | "id"
  | "profession"
  | "start_date"
  | "end_date"
  | "status"
  | "notes"
  | "requirements"
  | "tasks"
>;

export async function workerHasShiftsOnStaffRequest(
  workerId: string,
  requestId: string,
): Promise<boolean> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id")
    .eq("request_id", requestId)
    .eq("worker_id", workerId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data != null;
}

export async function getStaffRequestSummaryForWorker(
  requestId: string,
  workerId: string,
): Promise<WorkerStaffRequestSummary | null> {
  const ok = await workerHasShiftsOnStaffRequest(workerId, requestId);
  if (!ok) return null;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("staff_requests")
    .select("id, profession, start_date, end_date, status, notes, requirements, tasks")
    .eq("id", requestId)
    .single();

  if (error) throw new Error(error.message);
  return data as WorkerStaffRequestSummary;
}

export async function getStaffRequestSiteForWorker(
  requestId: string,
  workerId: string,
): Promise<{ location: StaffRequestSiteRow | null } | null> {
  const ok = await workerHasShiftsOnStaffRequest(workerId, requestId);
  if (!ok) return null;

  const supabase = await createAdminClient();
  const { data: sr, error: srErr } = await supabase
    .from("staff_requests")
    .select("operator_id, location")
    .eq("id", requestId)
    .single();

  if (srErr || sr == null) return null;

  const fromRequest = parseSiteRowFromStaffRequestLocation(sr.location);
  if (fromRequest) return { location: fromRequest };

  const { data: opRow } = await supabase
    .from("operators")
    .select("user_id")
    .eq("id", sr.operator_id)
    .maybeSingle();
  const creatorUserId = opRow?.user_id ?? null;
  if (!creatorUserId) return { location: null };

  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select(
      "address, address_line_1, address_line_2, city, admin_area, postal_code, country_code",
    )
    .eq("user_id", creatorUserId)
    .maybeSingle();

  if (locErr) throw new Error(locErr.message);
  return {
    location: loc
      ? { ...loc, instructions: null as string | null }
      : null,
  };
}
