"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/services/supabase/server";
import { getSession } from "@/lib/get-session";

function generateCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

export async function createReferralCode(): Promise<{
  code: string | null;
  error: string | null;
}> {
  const session = await getSession();
  if (!session) return { code: null, error: "Not authenticated" };

  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existing?.code) return { code: existing.code, error: null };

  const code = generateCode();
  const { error } = await supabase.from("referral_codes").insert({
    user_id: session.userId,
    role: session.role,
    code,
  });

  if (error) return { code: null, error: error.message };
  return { code, error: null };
}

/**
 * Records a referral relationship after a new user signs up.
 * Reads the referral_code cookie set by the /refer/[code] route handler,
 * looks up the referrer, and creates a referral record.
 */
export async function recordReferral(): Promise<{
  success: boolean;
  error: string | null;
}> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const cookieStore = await cookies();
  const referralCode = cookieStore.get("referral_code")?.value;
  if (!referralCode) return { success: false, error: "No referral code" };

  const supabase = await createAdminClient();

  const { data: codeRecord } = await supabase
    .from("referral_codes")
    .select("user_id, role")
    .eq("code", referralCode)
    .maybeSingle();

  if (!codeRecord) {
    cookieStore.delete("referral_code");
    return { success: false, error: "Invalid referral code" };
  }

  if (codeRecord.user_id === session.userId) {
    cookieStore.delete("referral_code");
    return { success: false, error: "Cannot refer yourself" };
  }

  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("referrer_id", codeRecord.user_id)
    .eq("referred_id", session.userId)
    .maybeSingle();

  if (existing) {
    cookieStore.delete("referral_code");
    return { success: true, error: null };
  }

  const { error } = await supabase.from("referrals").insert({
    referrer_id: codeRecord.user_id,
    referred_id: session.userId,
    referrer_role: codeRecord.role,
    status: "pending",
  });

  cookieStore.delete("referral_code");

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
