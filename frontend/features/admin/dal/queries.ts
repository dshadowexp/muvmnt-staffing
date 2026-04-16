"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import type { Tables } from "@/services/supabase/types/database";
import { redirect } from "next/navigation";
import { cache } from "react";

export type AdminDashboardSnapshot = {
  usersCount: number;
  workerCount: number;
  clientCount: number;
  jobCount: number;
  workers: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    profession: string;
    status: string | null;
    created_at: string;
  }[];
  clients: {
    id: string;
    name: string;
    type: string;
    user_id: string;
    created_at: string;
  }[];
  jobs: {
    id: string;
    positions: number;
    client_id: string;
    start_date: string;
    created_at: string;
    status: string;
  }[];
};

export async function requireAdminSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "admin") redirect("/app");
}

export type AdminWorkerRow = AdminDashboardSnapshot["workers"][number];
export type AdminClientRow = AdminDashboardSnapshot["clients"][number];
export type AdminJobRow = AdminDashboardSnapshot["jobs"][number];

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
  certifications: Pick<
    Tables<"certifications">,
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

    const [certsRes, authsRes, payrollRes, userRes] = await Promise.all([
      supabase
        .from("certifications")
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
      certifications: certsRes.data ?? [],
      authorizations: authsRes.data ?? [],
      payroll: payrollRes.data ?? null,
    };
  },
);

export async function getAdminClientsList(
  limit = 100,
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

export async function getAdminJobsList(limit = 100): Promise<AdminJobRow[]> {
  await requireAdminSession();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("staff_requests")
    .select("id, positions, client_id, start_date, created_at, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  await requireAdminSession();

  const supabase = await createAdminClient();

  const [workersRes, clientsRes, jobsRes, usersRes] = await Promise.all([
    supabase
      .from("workers")
      .select(
        "id, user_id, first_name, last_name, profession, status, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("clients")
      .select("id, name, type, user_id, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("staff_requests")
      .select("id, positions, client_id, start_date, created_at, status", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("users").select("id", { count: "exact", head: true }),
  ]);

  const err =
    workersRes.error?.message ??
    clientsRes.error?.message ??
    jobsRes.error?.message ??
    usersRes.error?.message;
  if (err) throw new Error(err);

  return {
    usersCount: usersRes.count ?? 0,
    workerCount: workersRes.count ?? 0,
    clientCount: clientsRes.count ?? 0,
    jobCount: jobsRes.count ?? 0,
    workers: workersRes.data ?? [],
    clients: clientsRes.data ?? [],
    jobs: jobsRes.data ?? [],
  };
}
