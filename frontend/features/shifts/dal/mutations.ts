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
