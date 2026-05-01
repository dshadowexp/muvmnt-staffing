import "server-only";

import { createAdminClient } from "@/supabase/server";
import { WORKER_STAGE_ORDER } from "@/features/staff/lib/worker-stage-order";
import { isWorkAuthorizationSubmitted } from "@/features/staff/lib/work-authorization-submitted";

/**
 * Compliance → availability when Stripe identity is verified and work authorization
 * is on file (uploaded or admin-verified). Payroll automation is deferred — we skip
 * the payroll stage in this transition until a separate payroll mechanism exists.
 */
export async function tryPromoteWorkerAfterComplianceChecks(
  userId: string,
): Promise<void> {
  const supabase = await createAdminClient();

  const { data: worker, error: wErr } = await supabase
    .from("workers")
    .select("id, stage")
    .eq("user_id", userId)
    .maybeSingle();

  if (wErr || !worker || worker.stage !== "compliance") return;

  const { data: idv } = await supabase
    .from("identity_verification")
    .select("verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (!idv?.verified) return;

  const { data: wa } = await supabase
    .from("work_authorizations")
    .select("file_url, is_verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (!isWorkAuthorizationSubmitted(wa)) return;

  const { error: upErr } = await supabase
    .from("workers")
    .update({ stage: "availability" })
    .eq("user_id", userId)
    .eq("stage", "compliance");

  if (upErr) {
    console.error("[stage-promotion] compliance → availability failed", upErr);
  }
}

/**
 * Availability → live when the worker has a geo cell (profile location) and at least
 * one weekly availability row saved.
 */
export async function tryPromoteWorkerAfterAvailabilityChecks(
  userId: string,
): Promise<void> {
  const supabase = await createAdminClient();

  const { data: worker, error: wErr } = await supabase
    .from("workers")
    .select("id, stage, cell_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (wErr || !worker || worker.stage !== "availability") return;
  if (!worker.cell_id?.trim()) return;

  const { count, error: cErr } = await supabase
    .from("availability")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (cErr || !count || count < 1) return;

  const { error: upErr } = await supabase
    .from("workers")
    .update({ stage: "live" })
    .eq("user_id", userId)
    .eq("stage", "availability");

  if (upErr) {
    console.error("[stage-promotion] availability → live failed", upErr);
  }
}

/** Admin-only: move worker to an earlier or later lifecycle stage (does not validate prerequisites). */
export async function setWorkerLifecycleStage(
  workerId: string,
  stage: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!WORKER_STAGE_ORDER.includes(stage as (typeof WORKER_STAGE_ORDER)[number])) {
    return { ok: false, message: "Invalid stage." };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase.from("workers").update({ stage }).eq("id", workerId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
