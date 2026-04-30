import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import { getSession } from "@/lib/get-session";

export type OperatorContext = {
  userId: string;
  facilityId: string;
  operatorId: string;
};

export async function requireOperatorContext(): Promise<
  ({ ok: true } & OperatorContext) | { ok: false; message: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Unauthenticated" };
  if (session.role !== "client") return { ok: false, message: "Unauthorized" };
  if (!session.facilityId) return { ok: false, message: "No facility" };

  const supabase = await createAdminClient();
  const { data: op, error } = await supabase
    .from("operators")
    .select("id, facility_id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error || !op) return { ok: false, message: "Operator record not found" };
  if (op.facility_id !== session.facilityId) {
    return { ok: false, message: "Facility mismatch" };
  }
  return {
    ok: true,
    userId: session.userId,
    facilityId: op.facility_id,
    operatorId: op.id,
  };
}

export async function getUserIdForOperator(
  operatorId: string,
): Promise<string | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("operators")
    .select("user_id")
    .eq("id", operatorId)
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function getOperatorEmail(operatorId: string): Promise<string | null> {
  const userId = await getUserIdForOperator(operatorId);
  if (!userId) return null;
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return data?.email ?? null;
}
