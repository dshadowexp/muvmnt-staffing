import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import type { Database } from "@/supabase/types/database";
import { SHIFT_STATUS_SCHEDULED, normalizeShiftStatus } from "../constants";

export type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];

/**
 * Minimal embed used by the action services (worker/client transitions and
 * review flows). Joins the parent staff request because every transition needs
 * to authorise the caller and read pricing + requirements for re-matching.
 */
export type ShiftActionContext = {
    id: string;
    worker_id: string;
    status: string | null;
    start_time: string | null;
    end_time: string | null;
    staff_requests: {
        facility_id: string;
        pricing_tier: string | null;
        /** H3 cell id — used to build the candidate search ring. */
        cell_id: string | null;
        profession: string;
        requirements: string[];
        daily_time_windows: unknown;
    } | null;
};

export type StaffRequestShiftEmbed = Pick<
  Database["public"]["Tables"]["staff_requests"]["Row"],
  | "id"
  | "start_date"
  | "end_date"
  | "pricing_rate"
  | "facility_id"
  | "operator_id"
  | "profession"
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

export type FacilityNameEmbed = {
  id: string;
  name: string;
};

/** @deprecated Use FacilityNameEmbed */
export type ClientNameEmbed = FacilityNameEmbed;

/** Shift row with staff request, assigned worker, and facility name (for detail screens). */
export type ShiftDetail = ShiftWithStaffRequestAndWorker & {
  facilities: FacilityNameEmbed | null;
};

const staffRequestSelect = `
  id,
  start_date,
  end_date,
  pricing_rate,
  facility_id,
  operator_id,
  profession
`;

const workerSelect = `first_name, last_name, photo_url`;

const clientSelect = `id, name`;

const shiftDetailSelect = `*, staff_requests ( ${staffRequestSelect} ), workers ( ${workerSelect} ), facilities ( ${clientSelect} )`;

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
  const rows = (data ?? []) as ShiftWithStaffRequestAndWorker[];
  // Pending assignments (`scheduled`) belong on the home “shift requests” cards, not this list.
  return rows.filter(
    (row) => normalizeShiftStatus(row.status) !== SHIFT_STATUS_SCHEDULED,
  );
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
 * One shift visible to a facility client (`staff_requests.facility_id`).
 */
export async function getShiftForFacilityClient(
  shiftId: string,
  facilityId: string,
): Promise<ShiftDetail | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} ), facilities ( ${clientSelect} )`,
    )
    .eq("id", shiftId)
    .eq("staff_requests.facility_id", facilityId)
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

/** One row per staff request: scheduled shifts awaiting worker confirm, grouped for home cards. */
export type WorkerPendingRequestAssignment = {
  requestId: string;
  profession: string;
  startDate: string;
  endDate: string | null;
  shiftCount: number;
  /** Earliest `shifts.created_at` in the group (assignment time for countdown). */
  assignedAt: string;
};

export async function listScheduledAssignmentsGroupedByRequestForWorker(
  workerId: string,
): Promise<WorkerPendingRequestAssignment[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `
      id,
      created_at,
      request_id,
      staff_requests!inner (
        id,
        profession,
        start_date,
        end_date
      )
      `,
    )
    .eq("worker_id", workerId)
    .eq("status", SHIFT_STATUS_SCHEDULED);

  if (error) throw new Error(error.message);

  const byRequest = new Map<string, WorkerPendingRequestAssignment>();

  for (const row of data ?? []) {
    const sr = row.staff_requests as {
      id: string;
      profession: string;
      start_date: string;
      end_date: string | null;
    } | null;
    if (!sr || row.request_id !== sr.id) continue;

    const assignedAt = row.created_at as string;
    const existing = byRequest.get(row.request_id);
    if (!existing) {
      byRequest.set(row.request_id, {
        requestId: row.request_id,
        profession: sr.profession,
        startDate: sr.start_date,
        endDate: sr.end_date,
        shiftCount: 1,
        assignedAt,
      });
    } else {
      existing.shiftCount += 1;
      if (new Date(assignedAt).getTime() < new Date(existing.assignedAt).getTime()) {
        existing.assignedAt = assignedAt;
      }
    }
  }

  return [...byRequest.values()].sort(
    (a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime(),
  );
}

/**
 * Shifts for a staff request assigned to a specific worker.
 */
export async function listShiftsForWorkerOnRequest(
  workerId: string,
  requestId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("request_id", requestId)
    .eq("worker_id", workerId)
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
 * Shifts for a staff request, scoped to the facility (`staff_requests.facility_id`).
 */
export async function listShiftsForClientRequest(
  requestId: string,
  facilityId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("request_id", requestId)
    .eq("staff_requests.facility_id", facilityId)
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
 * Stats for completed shifts belonging to the signed-in facility.
 */
export async function completedShiftStatsForClient(): Promise<{ count: number; totalMinutes: number }> {
  const session = await getSession();
  if (!session?.facilityId) return { count: 0, totalMinutes: 0 };
  const facilityId = session.facilityId;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "checkin_time, checkout_time, start_time, end_time, staff_requests!inner ( facility_id )",
    )
    .eq("staff_requests.facility_id", facilityId)
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
  dayStartUtc: string,
  dayEndUtc: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const session = await getSession();
  if (!session?.facilityId) return [];
  const facilityId = session.facilityId;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("staff_requests.facility_id", facilityId)
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
 * Loads a shift with its parent staff-request slice for action services.
 * Returns `null` (rather than throwing) when the row is missing.
 */
export async function getShiftWithStaffRequest(
    shiftId: string,
): Promise<ShiftActionContext | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("shifts")
        .select(
            `
            id,
            worker_id,
            status,
            start_time,
            end_time,
            staff_requests!inner (
                facility_id,
                pricing_tier,
                cell_id,
                profession,
                requirements,
                daily_time_windows
            )
            `,
        )
        .eq("id", shiftId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return (data ?? null) as unknown as ShiftActionContext | null;
}

/** `workers.id` for a given Firebase/Supabase user id (or `null` if missing). */
export async function getWorkerIdByUserId(
    userId: string,
): Promise<string | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data?.id ?? null;
}

/** `workers.user_id` for a given `workers.id` (used by reassignment to verify ownership). */
export async function getWorkerUserIdByWorkerId(
    workerId: string,
): Promise<string | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("workers")
        .select("user_id")
        .eq("id", workerId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data?.user_id ?? null;
}

export type ShiftReviewContext = {
    shiftId: string;
    workerId: string;
    workerUserId: string;
    clientUserId: string;
    facilityId: string;
};

export type ShiftReviewLoadResult =
    | { ok: true; ctx: ShiftReviewContext }
    | { ok: false; code?: string; message: string };

/**
 * Resolve and authorise a completed shift for the client owner. Used by both
 * rating and tip flows. The caller must already be the client of record.
 */
export async function loadCompletedShiftForClient(
    facilityId: string,
    clientUserId: string,
    shiftId: string,
    completedStatus: string,
): Promise<ShiftReviewLoadResult> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("shifts")
        .select(
            `
            id,
            status,
            worker_id,
            facility_id,
            staff_requests!inner ( facility_id ),
            workers!inner ( user_id )
            `,
        )
        .eq("id", shiftId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") {
        return { ok: false, message: error.message };
    }
    if (!data) return { ok: false, message: "Shift not found" };

    const row = data as unknown as {
        id: string;
        status: string | null;
        worker_id: string;
        facility_id: string;
        staff_requests: { facility_id: string } | null;
        workers: { user_id: string } | null;
    };

    if (!row.staff_requests || row.staff_requests.facility_id !== facilityId) {
        return { ok: false, message: "Shift not found" };
    }
    if ((row.status ?? "").trim().toLowerCase() !== completedStatus) {
        return {
            ok: false,
            code: "not_completed",
            message: "Only completed shifts can be reviewed",
        };
    }
    if (!row.workers?.user_id) {
        return { ok: false, message: "Worker account not found" };
    }

    return {
        ok: true,
        ctx: {
            shiftId,
            workerId: row.worker_id,
            workerUserId: row.workers.user_id,
            clientUserId,
            facilityId: row.facility_id,
        },
    };
}

/** Whether this client has already left a tip on a given shift. */
export async function getExistingTipIdForClient(
    shiftId: string,
    clientUserId: string,
): Promise<string | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("shift_tips")
        .select("id")
        .eq("shift_id", shiftId)
        .eq("client_user_id", clientUserId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data?.id ?? null;
}

export type ShiftPayoutContext = {
    id: string;
    request_id: string;
    status: string | null;
    worker_id: string;
    hourly_rate: number | null;
    start_time: string | null;
    end_time: string | null;
};

/** Read the columns the payout job needs (status / billable hours / amount). */
export async function getShiftForPayout(
    shiftId: string,
): Promise<ShiftPayoutContext | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("shifts")
        .select(
            "id, request_id, status, worker_id, hourly_rate, start_time, end_time",
        )
        .eq("id", shiftId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return (data ?? null) as ShiftPayoutContext | null;
}

/** Has this shift already been transferred (idempotency for payouts)? */
export async function getExistingTransferIdForShift(
    shiftId: string,
): Promise<string | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("transfers")
        .select("id")
        .eq("shift_id", shiftId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data?.id ?? null;
}

/** Worker `user_id` + first name for payout receipt notifications. */
export async function getWorkerProfileForPayout(
    workerId: string,
): Promise<{ userId: string; firstName: string | null } | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("workers")
        .select("user_id, first_name")
        .eq("id", workerId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data?.user_id) return null;
    return { userId: data.user_id, firstName: data.first_name ?? null };
}

/** Stripe payout destination for a worker, if Connect is set up. */
export async function getWorkerPayoutAccount(
    workerUserId: string,
): Promise<
    | { stripeAccountId: string; payoutsEnabled: boolean | null }
    | null
> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("payroll_accounts")
        .select("stripe_account_id, payouts_enabled")
        .eq("user_id", workerUserId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data?.stripe_account_id) return null;
    return {
        stripeAccountId: data.stripe_account_id,
        payoutsEnabled: data.payouts_enabled ?? null,
    };
}

/**
 * Latest succeeded `payments` row for a staff request — used to derive the
 * source charge id for `Stripe.transfers.create({ source_transaction })`.
 */
export async function getLatestSucceededPaymentForRequest(
    requestId: string,
): Promise<{ stripePaymentId: string | null } | null> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("payments")
        .select("stripe_payment_id")
        .eq("request_id", requestId)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data) return null;
    return { stripePaymentId: data.stripe_payment_id ?? null };
}

/** Worker payout (tip) Stripe Connect account — destination + status flags. */
export async function getWorkerTipAccount(
    workerUserId: string,
): Promise<
    | {
          stripeAccountId: string;
          chargesEnabled: boolean | null;
      }
    | null
> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("payroll_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("user_id", workerUserId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data?.stripe_account_id) return null;
    return {
        stripeAccountId: data.stripe_account_id,
        chargesEnabled: data.charges_enabled ?? null,
    };
}

/** Facility billing snapshot for tipping flow — saved card on file. */
export async function getFacilityBillingForTip(
    facilityId: string,
): Promise<
    | {
          stripeCustomerId: string;
      }
    | null
> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("facility_id", facilityId)
        .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data?.stripe_customer_id) return null;
    return {
        stripeCustomerId: data.stripe_customer_id,
    };
}

/**
 * All shifts for staff requests belonging to a facility.
 */
export async function listShiftsForClientUser(
  facilityId: string,
): Promise<ShiftWithStaffRequestAndWorker[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `*, staff_requests!inner ( ${staffRequestSelect} ), workers ( ${workerSelect} )`,
    )
    .eq("staff_requests.facility_id", facilityId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftWithStaffRequestAndWorker[];
}
