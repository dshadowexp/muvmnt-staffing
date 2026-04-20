"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import type { Tables } from "@/services/supabase/types/database";
import { redirect } from "next/navigation";
import { cache } from "react";

export type AdminWorkerRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profession: string;
  status: string | null;
  created_at: string;
};

export type AdminClientRow = {
  id: string;
  name: string;
  type: string;
  user_id: string;
  created_at: string;
};

export type AdminJobRow = {
  id: string;
  positions: number;
  client_id: string;
  client_name: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  status: string;
};

export type AdminShiftRow = {
  id: string;
  request_id: string;
  client_id: string;
  client_name: string | null;
  worker_id: string;
  worker_name: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  hourly_rate: number | null;
  created_at: string;
};

export type AdminAuthorizationRow = {
  id: number;
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
  clientCount: number;
  jobCount: number;
  shiftCount: number;
  authorizationCount: number;
  complianceCount: number;
  balanceCents: number;
  balanceCurrency: string;
  workers: AdminWorkerRow[];
  clients: AdminClientRow[];
  jobs: AdminJobRow[];
  shifts: AdminShiftRow[];
  authorizations: AdminAuthorizationRow[];
  compliances: AdminComplianceRow[];
};

export async function requireAdminSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "admin") redirect(`/${session.role}`);
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
      "id, user_id, first_name, last_name, profession, status, created_at",
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

// ---------- Clients ----------

export async function getAdminClientsList(
  limit = 200,
): Promise<AdminClientRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, type, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AdminClientReview = {
  client: Tables<"clients">;
  user: Pick<
    Tables<"users">,
    | "email"
    | "phone_number"
    | "is_email_verified"
    | "is_phone_verified"
    | "is_active"
  > | null;
  location: Pick<
    Tables<"locations">,
    | "address"
    | "address_line_1"
    | "address_line_2"
    | "city"
    | "admin_area"
    | "postal_code"
    | "country_code"
  > | null;
  totals: {
    requestsCount: number;
    shiftsCount: number;
    paidCents: number;
  };
};

export const getAdminClientReview = cache(
  async (clientId: string): Promise<AdminClientReview | null> => {
    await requireAdminSession();
    const supabase = await createAdminClient();

    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (cErr || !client) return null;

    const uid = client.user_id;

    const [userRes, locRes, requestsRes, shiftsRes] = await Promise.all([
      supabase
        .from("users")
        .select(
          "email, phone_number, is_email_verified, is_phone_verified, is_active",
        )
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("locations")
        .select(
          "address, address_line_1, address_line_2, city, admin_area, postal_code, country_code",
        )
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("staff_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", uid),
      supabase
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId),
    ]);

    // Sum payments succeeded for this client's requests.
    let paidCents = 0;
    const { data: clientRequests } = await supabase
      .from("staff_requests")
      .select("id")
      .eq("client_id", uid);
    const ids = (clientRequests ?? []).map((r) => r.id);
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
      client,
      user: userRes.data ?? null,
      location: locRes.data ?? null,
      totals: {
        requestsCount: requestsRes.count ?? 0,
        shiftsCount: shiftsRes.count ?? 0,
        paidCents,
      },
    };
  },
);

// ---------- Requests (staff_requests) ----------

async function joinClientNamesByUserId(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("user_id, name")
    .in("user_id", Array.from(new Set(userIds)));
  const map = new Map<string, string>();
  for (const c of data ?? []) {
    if (c.user_id) map.set(c.user_id, c.name);
  }
  return map;
}

export async function getAdminJobsList(limit = 200): Promise<AdminJobRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("staff_requests")
    .select("id, positions, client_id, start_date, end_date, created_at, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const names = await joinClientNamesByUserId(rows.map((r) => r.client_id));
  return rows.map((r) => ({
    id: r.id,
    positions: r.positions,
    client_id: r.client_id,
    client_name: names.get(r.client_id) ?? null,
    start_date: r.start_date,
    end_date: r.end_date ?? null,
    created_at: r.created_at,
    status: r.status,
  }));
}

export type AdminRequestReview = {
  request: Tables<"staff_requests">;
  client: { id: string; name: string; user_id: string } | null;
  location: Pick<
    Tables<"locations">,
    "address" | "city" | "admin_area" | "postal_code" | "country_code"
  > | null;
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

    const [clientRes, locRes, shiftsRes, paysRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, user_id")
        .eq("user_id", request.client_id)
        .maybeSingle(),
      supabase
        .from("locations")
        .select("address, city, admin_area, postal_code, country_code")
        .eq("user_id", request.client_id)
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

    return {
      request,
      client: clientRes.data ?? null,
      location: locRes.data ?? null,
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

async function joinClientNamesByClientId(
  clientIds: string[],
): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", Array.from(new Set(clientIds)));
  const map = new Map<string, string>();
  for (const c of data ?? []) {
    map.set(c.id, c.name);
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
      "id, request_id, client_id, worker_id, start_time, end_time, status, hourly_rate, created_at",
    )
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const [clientNames, workerNames] = await Promise.all([
    joinClientNamesByClientId(rows.map((r) => r.client_id)),
    joinWorkerNamesByWorkerId(rows.map((r) => r.worker_id)),
  ]);

  return rows.map((r) => ({
    id: r.id,
    request_id: r.request_id,
    client_id: r.client_id,
    client_name: clientNames.get(r.client_id) ?? null,
    worker_id: r.worker_id,
    worker_name: workerNames.get(r.worker_id) ?? null,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    hourly_rate: r.hourly_rate,
    created_at: r.created_at,
  }));
}

export type AdminShiftReview = {
  shift: Tables<"shifts">;
  client: { id: string; name: string } | null;
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

    const [clientRes, workerRes, requestRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name")
        .eq("id", shift.client_id)
        .maybeSingle(),
      supabase
        .from("workers")
        .select("id, first_name, last_name")
        .eq("id", shift.worker_id)
        .maybeSingle(),
      supabase
        .from("staff_requests")
        .select("id, positions, start_date, end_date, status")
        .eq("id", shift.request_id)
        .maybeSingle(),
    ]);

    return {
      shift,
      client: clientRes.data ?? null,
      worker: workerRes.data ?? null,
      request: requestRes.data ?? null,
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
    authorizationId: number,
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
    clientsRes,
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
        "id, user_id, first_name, last_name, profession, status, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("clients")
      .select("id, name, type, user_id, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("staff_requests")
      .select(
        "id, positions, client_id, start_date, end_date, created_at, status",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("shifts")
      .select(
        "id, request_id, client_id, worker_id, start_time, end_time, status, hourly_rate, created_at",
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
    clientsRes.error?.message ??
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

  const [jobClientNames, shiftClientNames, shiftWorkerNames, authWorkerNames, compWorkerNames] =
    await Promise.all([
      joinClientNamesByUserId(jobsRaw.map((r) => r.client_id)),
      joinClientNamesByClientId(shiftsRaw.map((r) => r.client_id)),
      joinWorkerNamesByWorkerId(shiftsRaw.map((r) => r.worker_id)),
      joinWorkerNamesByUserId(authsRaw.map((r) => r.user_id)),
      joinWorkerNamesByUserId(compsRaw.map((r) => r.user_id)),
    ]);

  return {
    usersCount: usersRes.count ?? 0,
    workerCount: workersRes.count ?? 0,
    clientCount: clientsRes.count ?? 0,
    jobCount: jobsRes.count ?? 0,
    shiftCount: shiftsRes.count ?? 0,
    authorizationCount: authsRes.count ?? 0,
    complianceCount: compsRes.count ?? 0,
    balanceCents,
    balanceCurrency: balanceCurrency.toUpperCase(),
    workers: workersRes.data ?? [],
    clients: clientsRes.data ?? [],
    jobs: jobsRaw.map((r) => ({
      id: r.id,
      positions: r.positions,
      client_id: r.client_id,
      client_name: jobClientNames.get(r.client_id) ?? null,
      start_date: r.start_date,
      end_date: r.end_date ?? null,
      created_at: r.created_at,
      status: r.status,
    })),
    shifts: shiftsRaw.map((r) => ({
      id: r.id,
      request_id: r.request_id,
      client_id: r.client_id,
      client_name: shiftClientNames.get(r.client_id) ?? null,
      worker_id: r.worker_id,
      worker_name: shiftWorkerNames.get(r.worker_id) ?? null,
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
