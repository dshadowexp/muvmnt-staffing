import "server-only";

import { createAdminClient } from "@/supabase/server";

/**
 * Ensures a facility operator has an `operators` row after Firebase exchange:
 * - Email/password sign-up: row may include names from the sign-up form (via LS → exchange).
 * - OAuth sign-up: insert a stub with null names so facility sign-in checks still pass.
 * - Invite acceptance: row already exists — only fill names if still blank and names provided.
 */
export async function ensureOperatorRecordForExchange(params: {
  userId: string;
  signupNames: { firstName: string; lastName: string } | null | undefined;
}): Promise<void> {
  const supabase = await createAdminClient();
  const { data: op } = await supabase
    .from("operators")
    .select("id, first_name, last_name")
    .eq("user_id", params.userId)
    .maybeSingle();

  const fn = params.signupNames?.firstName?.trim() || null;
  const ln = params.signupNames?.lastName?.trim() || null;

  if (!op) {
    const { error } = await supabase.from("operators").insert({
      user_id: params.userId,
      facility_id: null,
      permission: "owner",
      first_name: fn,
      last_name: ln,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (fn && ln && !op.first_name && !op.last_name) {
    const { error } = await supabase
      .from("operators")
      .update({ first_name: fn, last_name: ln })
      .eq("user_id", params.userId);
    if (error) throw new Error(error.message);
  }
}
