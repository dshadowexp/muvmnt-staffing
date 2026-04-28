import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";

export type WorkerTransferRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_transfer_id: string;
  shift_start: string;
  shift_end: string;
};

export async function getTransfersForWorker(): Promise<WorkerTransferRow[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = await createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!worker) return [];

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id")
    .eq("worker_id", worker.id);

  if (!shifts || shifts.length === 0) return [];

  const shiftIds = shifts.map((s) => s.id);

  const { data, error } = await supabase
    .from("transfers")
    .select("id, amount_cents, currency, status, created_at, stripe_transfer_id, shift_id")
    .in("shift_id", shiftIds)
    .order("created_at", { ascending: false });

  if (error) return [];

  const shiftMap = new Map<string, { start_time: string; end_time: string }>();
  const { data: shiftDetails } = await supabase
    .from("shifts")
    .select("id, start_time, end_time")
    .in("id", (data ?? []).map((t) => t.shift_id));

  for (const s of shiftDetails ?? []) {
    shiftMap.set(s.id, { start_time: s.start_time, end_time: s.end_time });
  }

  return (data ?? []).map((t) => {
    const shift = shiftMap.get(t.shift_id);
    return {
      id: t.id,
      amount_cents: t.amount_cents,
      currency: t.currency,
      status: t.status,
      created_at: t.created_at,
      stripe_transfer_id: t.stripe_transfer_id,
      shift_start: shift?.start_time ?? t.created_at,
      shift_end: shift?.end_time ?? t.created_at,
    };
  });
}

export type WorkerTipRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_payment_intent_id: string;
  shift_start: string;
  shift_end: string;
};

/**
 * Tips the signed-in worker has received, newest first. Joins the shift row so
 * the table can show the shift window alongside the tip amount.
 */
export async function getTipsForWorker(): Promise<WorkerTipRow[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = await createAdminClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!worker) return [];

  const { data, error } = await supabase
    .from("shift_tips")
    .select(
      "id, amount_cents, currency, status, created_at, stripe_payment_intent_id, shift_id",
    )
    .eq("worker_id", worker.id)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  const shiftMap = new Map<string, { start_time: string; end_time: string }>();
  const { data: shiftDetails } = await supabase
    .from("shifts")
    .select("id, start_time, end_time")
    .in("id", data.map((t) => t.shift_id));

  for (const s of shiftDetails ?? []) {
    shiftMap.set(s.id, { start_time: s.start_time, end_time: s.end_time });
  }

  return data.map((t) => {
    const shift = shiftMap.get(t.shift_id);
    return {
      id: t.id,
      amount_cents: t.amount_cents,
      currency: t.currency,
      status: t.status,
      created_at: t.created_at,
      stripe_payment_intent_id: t.stripe_payment_intent_id,
      shift_start: shift?.start_time ?? t.created_at,
      shift_end: shift?.end_time ?? t.created_at,
    };
  });
}

export async function payrollAccountMeetsOnboardingRequirements(userId: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("payroll_accounts")
        .select("charges_enabled, details_submitted, payouts_enabled")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        return { ok: false as const, message: error.message };
    }
    if (!data) {
        return {
            ok: false as const,
            message: "Complete payroll setup before continuing.",
        };
    }
    if (
        data.charges_enabled !== true ||
        data.details_submitted !== true ||
        data.payouts_enabled !== true
    ) {
        return {
            ok: false as const,
            message:
                "Payroll account must have charges, payouts, and details fully enabled before continuing.",
        };
    }
    return { ok: true as const };
}

export async function retrieveConnectedAccount() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };
    const { userId } = session;

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('payroll_accounts')
        .select('*')
        .eq('user_id', userId) 
        .single();
    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data) return { error: null, data: null };

    return { data: {
        accountId: data.stripe_account_id,
        enabled: data.charges_enabled && data.payouts_enabled,
        completed: data.details_submitted,
    }};
}