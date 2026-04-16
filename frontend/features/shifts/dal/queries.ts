import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

export type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];

export type StaffRequestShiftEmbed = Pick<
  Database["public"]["Tables"]["staff_requests"]["Row"],
  "id" | "start_date" | "end_date" | "pricing_rate" | "client_id"
>;

export type WorkerNameEmbed = Pick<
  Database["public"]["Tables"]["workers"]["Row"],
  "first_name" | "last_name" | "photo_url"
>;

export type ShiftWithStaffRequest = ShiftRow & {
  staff_requests: StaffRequestShiftEmbed | null;
};

export type ShiftWithStaffRequestAndWorker = ShiftRow & {
  staff_requests: StaffRequestShiftEmbed | null;
  workers: WorkerNameEmbed | null;
};

export type ClientNameEmbed = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "id" | "name"
>;

/** Shift row with staff request, assigned worker, and billing client (for detail screens). */
export type ShiftDetail = ShiftWithStaffRequestAndWorker & {
  clients: ClientNameEmbed | null;
};

const staffRequestSelect = `
  id,
  start_date,
  end_date,
  pricing_rate,
  client_id
`;

const workerSelect = `first_name, last_name, photo_url`;

const clientSelect = `id, name`;

const shiftDetailSelect = `*, staff_requests ( ${staffRequestSelect} ), workers ( ${workerSelect} ), clients ( ${clientSelect} )`;

/**
 * Shifts assigned to a worker profile (`workers.id`).
 */
export async function listShiftsForWorker(
  workerId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftWithStaffRequestAndWorker[];
}

/**
 * One shift for a worker, with staff request, worker row, and client name.
 */
export async function getShiftForWorker(
  shiftId: string,
  workerId: string,
): Promise<ShiftDetail | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(shiftDetailSelect)
    .eq("id", shiftId)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return (data ?? null) as ShiftDetail | null;
}

/**
 * One shift visible to the client who owns the staff request.
 */
export async function getShiftForClientUser(
  shiftId: string,
  clientUserId: string,
): Promise<ShiftDetail | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} ), clients ( ${clientSelect} )`,
    )
    .eq("id", shiftId)
    .eq("staff_requests.client_id", clientUserId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return (data ?? null) as ShiftDetail | null;
}

/**
 * Shifts for a staff request (`shifts.request_id`).
 */
export async function listShiftsForStaffRequest(
  requestId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ShiftWithStaffRequestAndWorker[];
  return rows.filter(
    (row) =>
      row.request_id === requestId &&
      row.staff_requests != null &&
      row.staff_requests.id === requestId,
  );
}

/**
 * Shifts for a staff request, scoped to the request owner (`staff_requests.client_id` = app user id).
 */
export async function listShiftsForClientRequest(
  requestId: string,
  clientUserId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("request_id", requestId)
    .eq("staff_requests.client_id", clientUserId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ShiftWithStaffRequestAndWorker[];
  return rows.filter(
    (row) =>
      row.request_id === requestId &&
      row.staff_requests != null &&
      row.staff_requests.id === requestId,
  );
}

/**
 * All shifts across staff requests owned by the client user (`users.id`).
 */
export async function listShiftsForClientUser(
  clientUserId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("staff_requests.client_id", clientUserId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftWithStaffRequestAndWorker[];
}
