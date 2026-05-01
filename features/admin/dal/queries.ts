"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import type { Tables } from "@/supabase/types/database";
import { redirect } from "next/navigation";
import { cache } from "react";

export type AdminWorkerRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profession: string;
  stage: string;
  created_at: string;
};

export type AdminFacilityRow = {
  id: string;
  name: string;
  type: string;
  created_at: string;
};

/** @deprecated Use AdminFacilityRow */
export type AdminClientRow = AdminFacilityRow;

export type AdminJobRow = {
  id: string;
  positions: number;
  facility_id: string;
  operator_id: string;
  facility_name: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  status: string;
};

export type AdminShiftRow = {
  id: string;
  request_id: string;
  facility_id: string;
  facility_name: string | null;
  worker_id: string | null;
  worker_name: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  hourly_rate: number | null;
  created_at: string;
};

export type AdminAuthorizationRow = {
  id: string;
  user_id: string;
  type: string;
  is_verified: boolean;
  worker_name: string | null;
  created_at: string;
};

export type AdminComplianceRow = {
  id: string;
  user_id: string;
  name: string;
  is_verified: boolean;
  worker_name: string | null;
  created_at: string;
};

export type AdminDashboardSnapshot = {
  usersCount: number;
  workerCount: number;
  /** Facility (organization) count. */
  facilityCount: number;
  /** Platform operator / facility team member count. */
  operatorCount: number;
  jobCount: number;
  shiftCount: number;
  authorizationCount: number;
  complianceCount: number;
  balanceCents: number;
  balanceCurrency: string;
  workers: AdminWorkerRow[];
  facilities: AdminFacilityRow[];
  jobs: AdminJobRow[];
  shifts: AdminShiftRow[];
  authorizations: AdminAuthorizationRow[];
  compliances: AdminComplianceRow[];
};

export async function requireAdminSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "admin") redirect(`/`);
}

export async function getAdminNavProfile(
  userId: string,
): Promise<{ name: string; email: string } | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.email) return null;
  const local = data.email.split("@")[0] ?? "Admin";
  return { name: local, email: data.email };
}

// ---------- Workers ----------

export async function getAdminWorkersList(
  limit = 100,
): Promise<AdminWorkerRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("workers")
    .select(
      "id, user_id, first_name, last_name, profession, stage, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AdminWorkerReview = {
  worker: Tables<"workers">;
  user: Pick<
    Tables<"users">,
    | "email"
    | "phone_number"
    | "is_email_verified"
    | "is_phone_verified"
    | "is_active"
  > | null;
  compliances: Pick<
    Tables<"compliances">,
    "id" | "name" | "file_url" | "is_verified" | "created_at"
  >[];
  authorizations: Pick<
    Tables<"work_authorizations">,
    "id" | "type" | "file_url" | "is_verified" | "created_at"
  >[];
  payroll: Pick<
    Tables<"payroll_accounts">,
    | "stripe_account_id"
    | "payouts_enabled"
    | "charges_enabled"
    | "details_submitted"
    | "created_at"
  > | null;
};

export const getAdminWorkerReview = cache(
  async (workerId: string): Promise<AdminWorkerReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: worker, error: wErr } = await supabase
      .from("workers")
      .select("*")
      .eq("id", workerId)
      .single();

    if (wErr || !worker) return null;

    const uid = worker.user_id;

    const [compliancesRes, authsRes, payrollRes, userRes] = await Promise.all([
      supabase
        .from("compliances")
        .select("id, name, file_url, is_verified, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: true }),
      supabase
        .from("work_authorizations")
        .select("id, type, file_url, is_verified, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: true }),
      supabase
        .from("payroll_accounts")
        .select(
          "stripe_account_id, payouts_enabled, charges_enabled, details_submitted, created_at",
        )
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("users")
        .select(
          "email, phone_number, is_email_verified, is_phone_verified, is_active",
        )
        .eq("id", uid)
        .maybeSingle(),
    ]);

    return {
      worker,
      user: userRes.data ?? null,
      compliances: compliancesRes.data ?? [],
      authorizations: authsRes.data ?? [],
      payroll: payrollRes.data ?? null,
    };
  },
);

// ---------- Facilities ----------

export async function getAdminFacilitiesList(
  limit = 200,
): Promise<AdminFacilityRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("id, name, type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** @deprecated Use getAdminFacilitiesList */
export const getAdminClientsList = getAdminFacilitiesList;

export type AdminFacilityReview = {
  facility: Tables<"facilities">;
  user: Pick<
    Tables<"users">,
    | "email"
    | "phone_number"
    | "is_email_verified"
    | "is_phone_verified"
    | "is_active"
  > | null;
  totals: {
    requestsCount: number;
    shiftsCount: number;
    paidCents: number;
  };
};

/** @deprecated Use AdminFacilityReview */
export type AdminClientReview = AdminFacilityReview;

export const getAdminFacilityReview = cache(
  async (facilityId: string): Promise<AdminFacilityReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: facility, error: fErr } = await supabase
      .from("facilities")
      .select("*")
      .eq("id", facilityId)
      .single();

    if (fErr || !facility) return null;

    const { data: ownerOp } = await supabase
      .from("operators")
      .select("user_id")
      .eq("facility_id", facilityId)
      .eq("permission", "owner")
      .maybeSingle();
    const uid = ownerOp?.user_id ?? null;

    const [userRes, requestsRes, shiftsRes] = await Promise.all([
      uid
        ? supabase
            .from("users")
            .select(
              "email, phone_number, is_email_verified, is_phone_verified, is_active",
            )
            .eq("id", uid)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("staff_requests")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId),
      supabase
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId),
    ]);

    let paidCents = 0;
    const { data: facilityRequests } = await supabase
      .from("staff_requests")
      .select("id")
      .eq("facility_id", facilityId);
    const ids = (facilityRequests ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { data: pays } = await supabase
        .from("payments")
        .select("amount_cents, status")
        .in("request_id", ids);
      paidCents = (pays ?? [])
        .filter((p) => p.status === "succeeded" || p.status === "paid")
        .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
    }

    return {
      facility,
      user: (userRes as { data: unknown }).data as AdminFacilityReview["user"] ?? null,
      totals: {
        requestsCount: (requestsRes as { count: number | null }).count ?? 0,
        shiftsCount: (shiftsRes as { count: number | null }).count ?? 0,
        paidCents,
      },
    };
  },
);

/** @deprecated Use getAdminFacilityReview */
export const getAdminClientReview = getAdminFacilityReview;

// ---------- Requests (staff_requests) ----------

export async function getAdminJobsList(limit = 200): Promise<AdminJobRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("staff_requests")
    .select(
      "id, positions, facility_id, operator_id, start_date, end_date, created_at, status",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const facilityIds = [...new Set(rows.map((r) => r.facility_id))];
  const { data: facs } = await supabase
    .from("facilities")
    .select("id, name")
    .in("id", facilityIds);
  const facName = new Map((facs ?? []).map((f) => [f.id, f.name]));

  return rows.map((r) => ({
    id: r.id,
    positions: r.positions,
    facility_id: r.facility_id,
    operator_id: r.operator_id,
    facility_name: facName.get(r.facility_id) ?? null,
    start_date: r.start_date,
    end_date: r.end_date ?? null,
    created_at: r.created_at,
    status: r.status,
  }));
}

async function joinFacilityNamesByFacilityId(
  facilityIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(facilityIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const supabase = await createAdminClient();
  const { data } = await supabase.from("facilities").select("id, name").in("id", ids);
  return new Map((data ?? []).map((f) => [f.id, f.name]));
}

export type AdminRequestReview = {
  request: Tables<"staff_requests">;
  facility: { id: string; name: string; user_id: string } | null;
  shifts: Pick<
    Tables<"shifts">,
    | "id"
    | "worker_id"
    | "start_time"
    | "end_time"
    | "status"
    | "hourly_rate"
  >[];
  payments: Pick<
    Tables<"payments">,
    "id" | "amount_cents" | "currency" | "status" | "created_at"
  >[];
};

export const getAdminRequestReview = cache(
  async (requestId: string): Promise<AdminRequestReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: request, error: rErr } = await supabase
      .from("staff_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (rErr || !request) return null;

    const { data: creatorOp } = await supabase
      .from("operators")
      .select("user_id")
      .eq("id", request.operator_id)
      .maybeSingle();
    const creatorUserId = creatorOp?.user_id ?? null;

    const [facilityRes, shiftsRes, paysRes] = await Promise.all([
      supabase
        .from("facilities")
        .select("id, name")
        .eq("id", request.facility_id)
        .maybeSingle(),

      supabase
        .from("shifts")
        .select(
          "id, worker_id, start_time, end_time, status, hourly_rate",
        )
        .eq("request_id", requestId)
        .order("start_time", { ascending: true }),
      supabase
        .from("payments")
        .select("id, amount_cents, currency, status, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false }),
    ]);

    const facilityData = facilityRes.data;
    const facilityFormatted = facilityData
      ? {
          id: facilityData.id,
          name: facilityData.name,
          user_id: creatorUserId ?? "",
        }
      : null;

    return {
      request,
      facility: facilityFormatted,
      shifts: shiftsRes.data ?? [],
      payments: paysRes.data ?? [],
    };
  },
);

// ---------- Shifts ----------

async function joinWorkerNamesByUserId(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("workers")
    .select("user_id, first_name, last_name")
    .in("user_id", Array.from(new Set(userIds)));
  const map = new Map<string, string>();
  for (const w of data ?? []) {
    if (w.user_id) {
      map.set(w.user_id, `${w.first_name} ${w.last_name}`.trim());
    }
  }
  return map;
}

async function joinWorkerNamesByWorkerId(
  workerIds: string[],
): Promise<Map<string, string>> {
  if (workerIds.length === 0) return new Map();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("workers")
    .select("id, first_name, last_name")
    .in("id", Array.from(new Set(workerIds)));
  const map = new Map<string, string>();
  for (const w of data ?? []) {
    map.set(w.id, `${w.first_name} ${w.last_name}`.trim());
  }
  return map;
}

export async function getAdminShiftsList(
  limit = 200,
): Promise<AdminShiftRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      "id, request_id, facility_id, worker_id, start_time, end_time, status, hourly_rate, created_at",
    )
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const [facilityNames, workerNames] = await Promise.all([
    joinFacilityNamesByFacilityId(rows.map((r) => r.facility_id)),
    joinWorkerNamesByWorkerId(rows.map((r) => r.worker_id ?? "")),
  ]);

  return rows.map((r) => ({
    id: r.id,
    request_id: r.request_id,
    facility_id: r.facility_id,
    facility_name: facilityNames.get(r.facility_id) ?? null,
    worker_id: r.worker_id,
    worker_name: workerNames.get(r.worker_id ?? "") ?? null,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    hourly_rate: r.hourly_rate,
    created_at: r.created_at,
  }));
}

export type AdminShiftReview = {
  shift: Tables<"shifts">;
  facility: { id: string; name: string } | null;
  worker: { id: string; first_name: string; last_name: string } | null;
  request: Pick<
    Tables<"staff_requests">,
    "id" | "positions" | "start_date" | "end_date" | "status"
  > | null;
};

export const getAdminShiftReview = cache(
  async (shiftId: string): Promise<AdminShiftReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: shift, error: sErr } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", shiftId)
      .single();

    if (sErr || !shift) return null;

    const [facilityRes, workerRes, requestRes] = await Promise.all([
      supabase
        .from("facilities")
        .select("id, name")
        .eq("id", shift.facility_id)
        .maybeSingle(),
      supabase
        .from("workers")
        .select("id, first_name, last_name")
        .eq("id", shift.worker_id ?? "")
        .maybeSingle(),
      supabase
        .from("staff_requests")
        .select("id, positions, start_date, end_date, status")
        .eq("id", shift.request_id)
        .maybeSingle(),
    ]);

    return {
      shift,
      facility: facilityRes.data ?? null,
      worker: workerRes.data ?? null,
      request: requestRes.data ?? null,
    };
  },
);

// ---------- Operators (facility accounts) ----------

export type AdminOperatorRow = {
  id: string;
  user_id: string;
  facility_id: string | null;
  permission: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  /** Resolved contact email from users when operators.email is empty. */
  user_email: string | null;
  facility_name: string | null;
  created_at: string;
};

export async function getAdminOperatorsList(
  limit = 200,
): Promise<AdminOperatorRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data: ops, error } = await supabase
    .from("operators")
    .select(
      "id, user_id, facility_id, permission, first_name, last_name, email, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  const rows = ops ?? [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const facilityIds = [
    ...new Set(rows.map((r) => r.facility_id).filter(Boolean)),
  ] as string[];

  const [usersRes, facNames] = await Promise.all([
    supabase.from("users").select("id, email").in("id", userIds),
    facilityIds.length > 0
      ? joinFacilityNamesByFacilityId(facilityIds)
      : Promise.resolve(new Map<string, string>()),
  ]);

  const emailByUser = new Map((usersRes.data ?? []).map((u) => [u.id, u.email]));

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    facility_id: r.facility_id,
    permission: r.permission,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    user_email: emailByUser.get(r.user_id) ?? null,
    facility_name: r.facility_id ? facNames.get(r.facility_id) ?? null : null,
    created_at: r.created_at,
  }));
}

export type AdminOperatorReview = {
  operator: Tables<"operators">;
  user: Pick<
    Tables<"users">,
    | "email"
    | "phone_number"
    | "is_email_verified"
    | "is_active"
  > | null;
  facility: Pick<Tables<"facilities">, "id" | "name" | "type"> | null;
};

export const getAdminOperatorReview = cache(
  async (operatorId: string): Promise<AdminOperatorReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: operator, error: oErr } = await supabase
      .from("operators")
      .select("*")
      .eq("id", operatorId)
      .single();

    if (oErr || !operator) return null;

    const [userRes, facilityRes] = await Promise.all([
      supabase
        .from("users")
        .select("email, phone_number, is_email_verified, is_active")
        .eq("id", operator.user_id)
        .maybeSingle(),
      operator.facility_id
        ? supabase
            .from("facilities")
            .select("id, name, type")
            .eq("id", operator.facility_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      operator,
      user: userRes.data ?? null,
      facility: facilityRes.data ?? null,
    };
  },
);

// ---------- Work authorizations ----------

export async function getAdminAuthorizationsList(
  limit = 200,
): Promise<AdminAuthorizationRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("work_authorizations")
    .select("id, user_id, type, is_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const names = await joinWorkerNamesByUserId(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    is_verified: r.is_verified,
    worker_name: names.get(r.user_id) ?? null,
    created_at: r.created_at,
  }));
}

export type AdminAuthorizationReview = {
  authorization: Tables<"work_authorizations">;
  worker: Pick<
    Tables<"workers">,
    "id" | "first_name" | "last_name" | "profession" | "user_id"
  > | null;
};

export const getAdminAuthorizationReview = cache(
  async (
    authorizationId: string,
  ): Promise<AdminAuthorizationReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: authorization, error: aErr } = await supabase
      .from("work_authorizations")
      .select("*")
      .eq("id", authorizationId)
      .single();

    if (aErr || !authorization) return null;

    const { data: worker } = await supabase
      .from("workers")
      .select("id, first_name, last_name, profession, user_id")
      .eq("user_id", authorization.user_id)
      .maybeSingle();

    return {
      authorization,
      worker: worker ?? null,
    };
  },
);

// ---------- Compliances ----------

export async function getAdminCompliancesList(
  limit = 200,
): Promise<AdminComplianceRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("compliances")
    .select("id, user_id, name, is_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const names = await joinWorkerNamesByUserId(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    is_verified: r.is_verified,
    worker_name: names.get(r.user_id) ?? null,
    created_at: r.created_at,
  }));
}

export type AdminComplianceReview = {
  compliance: Tables<"compliances">;
  worker: Pick<
    Tables<"workers">,
    "id" | "first_name" | "last_name" | "profession" | "user_id"
  > | null;
};

export const getAdminComplianceReview = cache(
  async (complianceId: string): Promise<AdminComplianceReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: compliance, error: cErr } = await supabase
      .from("compliances")
      .select("*")
      .eq("id", complianceId)
      .single();

    if (cErr || !compliance) return null;

    const { data: worker } = await supabase
      .from("workers")
      .select("id, first_name, last_name, profession, user_id")
      .eq("user_id", compliance.user_id)
      .maybeSingle();

    return {
      compliance,
      worker: worker ?? null,
    };
  },
);

// ---------- Dashboard snapshot ----------

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  await requireAdminSession();

  const supabase = await createAdminClient();

  const [
    workersRes,
    facilitiesRes,
    operatorsCountRes,
    jobsRes,
    shiftsRes,
    authsRes,
    compsRes,
    usersRes,
    paymentsRes,
  ] = await Promise.all([
    supabase
      .from("workers")
      .select(
        "id, user_id, first_name, last_name, profession, stage, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("facilities")
      .select("id, name, type, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("operators").select("id", { count: "exact", head: true }),
    supabase
      .from("staff_requests")
      .select(
        "id, positions, facility_id, operator_id, start_date, end_date, created_at, status",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("shifts")
      .select(
        "id, request_id, facility_id, worker_id, start_time, end_time, status, hourly_rate, created_at",
        { count: "exact" },
      )
      .order("start_time", { ascending: false })
      .limit(8),
    supabase
      .from("work_authorizations")
      .select("id, user_id, type, is_verified, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("compliances")
      .select("id, user_id, name, is_verified, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("amount_cents, currency, status"),
  ]);

  const err =
    workersRes.error?.message ??
    facilitiesRes.error?.message ??
    operatorsCountRes.error?.message ??
    jobsRes.error?.message ??
    shiftsRes.error?.message ??
    authsRes.error?.message ??
    compsRes.error?.message ??
    usersRes.error?.message ??
    paymentsRes.error?.message;
  if (err) throw new Error(err);

  const allPayments = paymentsRes.data ?? [];
  const balanceCents = allPayments
    .filter((p) => p.status === "succeeded" || p.status === "paid")
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const balanceCurrency =
    allPayments.find((p) => Boolean(p.currency))?.currency ?? "CAD";

  // Resolve denormalized names for jobs/shifts/authorizations/compliances.
  const jobsRaw = jobsRes.data ?? [];
  const shiftsRaw = shiftsRes.data ?? [];
  const authsRaw = authsRes.data ?? [];
  const compsRaw = compsRes.data ?? [];

  const [jobFacilityNames, shiftFacilityNames, shiftWorkerNames, authWorkerNames, compWorkerNames] =
    await Promise.all([
      joinFacilityNamesByFacilityId(jobsRaw.map((r) => r.facility_id)),
      joinFacilityNamesByFacilityId(shiftsRaw.map((r) => r.facility_id)),
      joinWorkerNamesByWorkerId(shiftsRaw.map((r) => r.worker_id ?? "")),
      joinWorkerNamesByUserId(authsRaw.map((r) => r.user_id)),
      joinWorkerNamesByUserId(compsRaw.map((r) => r.user_id)),
    ]);

  return {
    usersCount: usersRes.count ?? 0,
    workerCount: workersRes.count ?? 0,
    facilityCount: facilitiesRes.count ?? 0,
    operatorCount: operatorsCountRes.count ?? 0,
    jobCount: jobsRes.count ?? 0,
    shiftCount: shiftsRes.count ?? 0,
    authorizationCount: authsRes.count ?? 0,
    complianceCount: compsRes.count ?? 0,
    balanceCents,
    balanceCurrency: balanceCurrency.toUpperCase(),
    workers: workersRes.data ?? [],
    facilities: facilitiesRes.data ?? [],
    jobs: jobsRaw.map((r) => ({
      id: r.id,
      positions: r.positions,
      facility_id: r.facility_id,
      operator_id: r.operator_id,
      facility_name: jobFacilityNames.get(r.facility_id) ?? null,
      start_date: r.start_date,
      end_date: r.end_date ?? null,
      created_at: r.created_at,
      status: r.status,
    })),
    shifts: shiftsRaw.map((r) => ({
      id: r.id,
      request_id: r.request_id,
      facility_id: r.facility_id,
      facility_name: shiftFacilityNames.get(r.facility_id) ?? null,
      worker_id: r.worker_id,
      worker_name: shiftWorkerNames.get(r.worker_id ?? "") ?? null,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      hourly_rate: r.hourly_rate,
      created_at: r.created_at,
    })),
    authorizations: authsRaw.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      is_verified: r.is_verified,
      worker_name: authWorkerNames.get(r.user_id) ?? null,
      created_at: r.created_at,
    })),
    compliances: compsRaw.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      is_verified: r.is_verified,
      worker_name: compWorkerNames.get(r.user_id) ?? null,
      created_at: r.created_at,
    })),
  };
}
