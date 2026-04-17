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

/** Number of shifts with status `completed` (or `done` / `paid`) for a worker. */
export async function countCompletedShiftsForWorker(
  workerId: string,
): Promise<number> {
  const supabase = await createAdminClient();
  const { count, error } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", workerId)
    .eq("status", "completed");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Lifetime earnings for a worker from the `transfers` table.
 * Joins `transfers.shift_id` → `shifts.worker_id`.
 */
export async function totalEarningsForWorker(
  workerId: string,
): Promise<{ amountCents: number; currency: string }> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("transfers")
    .select("amount_cents, currency, shifts!inner ( worker_id )")
    .eq("shifts.worker_id", workerId)
    .eq("status", "succeeded");
  if (error) throw new Error(error.message);
  let total = 0;
  let currency = "CAD";
  for (const row of data ?? []) {
    total += row.amount_cents ?? 0;
    if (row.currency) currency = row.currency;
  }
  return { amountCents: total, currency };
}

/**
 * Shifts for a worker on a specific calendar day (in the shift schedule timezone).
 * `dayStart` and `dayEnd` are ISO-8601 UTC timestamps bounding the day.
 */
export async function listShiftsForWorkerOnDay(
  workerId: string,
  dayStartUtc: string,
  dayEndUtc: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("worker_id", workerId)
    .gte("start_time", dayStartUtc)
    .lt("start_time", dayEndUtc)
    .not("status", "in", '("cancelled","canceled","declined")')
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftWithStaffRequestAndWorker[];
}

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
    .order("start_time", { ascending: true });

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
    .order("start_time", { ascending: true });

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
    .order("start_time", { ascending: true });

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
 * Stats for completed shifts belonging to a client user:
 * total count and total covered hours (from checkin/checkout or start/end).
 */
export async function completedShiftStatsForClient(
  clientUserId: string,
): Promise<{ count: number; totalMinutes: number }> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "checkin_time, checkout_time, start_time, end_time, staff_requests!inner ( client_id )",
    )
    .eq("staff_requests.client_id", clientUserId)
    .eq("status", "completed");
  if (error) throw new Error(error.message);

  let totalMinutes = 0;
  for (const row of data ?? []) {
    const start = row.checkin_time ?? row.start_time;
    const end = row.checkout_time ?? row.end_time;
    if (start && end) {
      const diff = new Date(end).getTime() - new Date(start).getTime();
      if (diff > 0) totalMinutes += diff / 60_000;
    }
  }
  return { count: (data ?? []).length, totalMinutes };
}

/**
 * Today's shifts across staff requests owned by the client user.
 * `dayStartUtc` / `dayEndUtc` bound the day in the shift schedule timezone.
 */
export async function listTodayShiftsForClientUser(
  clientUserId: string,
  dayStartUtc: string,
  dayEndUtc: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("staff_requests.client_id", clientUserId)
    .gte("start_time", dayStartUtc)
    .lt("start_time", dayEndUtc)
    .not("status", "in", '("cancelled","canceled","declined")')
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftWithStaffRequestAndWorker[];
}

export type ShiftReviewStatus = {
  rating: { rating: number; comment: string | null } | null;
  tip: { amountCents: number; currency: string } | null;
};

/**
 * Whether this client has already rated and/or tipped a given completed shift.
 * Used to drive the post-completion "Rate / Tip" UI (idempotent per client).
 */
export async function getShiftReviewStatusForClient(
  shiftId: string,
  clientUserId: string,
): Promise<ShiftReviewStatus> {
  const supabase = await createAdminClient();

  const [ratingRes, tipRes] = await Promise.all([
    supabase
      .from("shift_ratings")
      .select("rating, comment")
      .eq("shift_id", shiftId)
      .eq("client_user_id", clientUserId)
      .maybeSingle(),
    supabase
      .from("shift_tips")
      .select("amount_cents, currency")
      .eq("shift_id", shiftId)
      .eq("client_user_id", clientUserId)
      .maybeSingle(),
  ]);

  if (ratingRes.error && ratingRes.error.code !== "PGRST116") {
    throw new Error(ratingRes.error.message);
  }
  if (tipRes.error && tipRes.error.code !== "PGRST116") {
    throw new Error(tipRes.error.message);
  }

  return {
    rating: ratingRes.data
      ? { rating: ratingRes.data.rating, comment: ratingRes.data.comment ?? null }
      : null,
    tip: tipRes.data
      ? { amountCents: tipRes.data.amount_cents, currency: tipRes.data.currency }
      : null,
  };
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
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftWithStaffRequestAndWorker[];
}
