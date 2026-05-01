import "server-only";

import { createAdminClient } from "@/supabase/server";
import type { Tables } from "@/supabase/types/database";
import {
  parseSiteRowFromFacilityAddressJson,
  parseSiteRowFromStaffRequestLocation,
} from "../lib/staff-request-location-json";

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
    .select("facility_id, location")
    .eq("id", requestId)
    .single();

  if (srErr || sr == null) return null;

  const fromRequest = parseSiteRowFromStaffRequestLocation(sr.location);
  if (fromRequest) return { location: fromRequest };

  const { data: fac, error: facErr } = await supabase
    .from("facilities")
    .select("address")
    .eq("id", sr.facility_id)
    .maybeSingle();

  if (facErr) throw new Error(facErr.message);
  return {
    location: parseSiteRowFromFacilityAddressJson(fac?.address ?? null),
  };
}
