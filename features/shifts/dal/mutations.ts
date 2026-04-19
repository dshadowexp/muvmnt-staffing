import { createAdminClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

export type ShiftInsert = Database["public"]["Tables"]["shifts"]["Insert"];
export type ShiftUpdate = Database["public"]["Tables"]["shifts"]["Update"];
export type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];

export async function insertShift(payload: ShiftInsert): Promise<ShiftRow> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (data == null) throw new Error("Shift insert returned no row");
  return data;
}

export async function updateShift(
  id: string,
  patch: ShiftUpdate,
): Promise<ShiftRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

/**
 * Patch a shift by id and bump `updated_at`. Returns a small ok/err result so
 * action services don't need to translate Supabase errors themselves.
 */
export async function patchShiftById(
    shiftId: string,
    patch: ShiftUpdate,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();
    const { error } = await supabase
        .from("shifts")
        .update({ ...patch, updated_at: now })
        .eq("id", shiftId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

export type ShiftRatingInput = {
    shiftId: string;
    clientUserId: string;
    workerId: string;
    rating: number;
    comment: string | null;
};

/** Upsert the caller's rating for a completed shift (one row per client+shift). */
export async function upsertShiftRating(
    input: ShiftRatingInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("shift_ratings").upsert(
        {
            shift_id: input.shiftId,
            client_user_id: input.clientUserId,
            worker_id: input.workerId,
            rating: input.rating,
            comment: input.comment,
        },
        { onConflict: "shift_id,client_user_id" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

export type ShiftTipInput = {
    shiftId: string;
    clientUserId: string;
    workerId: string;
    amountCents: number;
    currency: string;
    stripePaymentIntentId: string;
    stripeDestinationAccountId: string;
};

/** Insert a `shift_tips` row reflecting a successful Stripe `paymentIntents.create`. */
export async function insertShiftTip(
    input: ShiftTipInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("shift_tips").insert({
        shift_id: input.shiftId,
        client_user_id: input.clientUserId,
        worker_id: input.workerId,
        amount_cents: input.amountCents,
        currency: input.currency,
        stripe_payment_intent_id: input.stripePaymentIntentId,
        stripe_destination_account_id: input.stripeDestinationAccountId,
        status: "succeeded",
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

export type ShiftTransferInput = {
    id: string;
    shiftId: string;
    amountCents: number;
    currency: string;
    stripeTransferId: string;
};

/** Insert a `transfers` row recording a worker payout for a completed shift. */
export async function insertShiftTransfer(
    input: ShiftTransferInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("transfers").insert({
        id: input.id,
        shift_id: input.shiftId,
        amount_cents: input.amountCents,
        currency: input.currency.toUpperCase(),
        stripe_transfer_id: input.stripeTransferId,
        status: "succeeded",
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

/** Updates a shift only if it belongs to the given worker (`workers.id`). */
export async function updateWorkerShift(
  shiftId: string,
  workerId: string,
  patch: ShiftUpdate,
): Promise<ShiftRow | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("shifts")
    .update(patch)
    .eq("id", shiftId)
    .eq("worker_id", workerId)
    .select()
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}
