"use server";

import { createAdminClient } from "@/supabase/server";
import { getSession } from "@/lib/get-session";

export async function getReferralCode(): Promise<{
  code: string | null;
  error: string | null;
}> {
  const session = await getSession();
  if (!session) return { code: null, error: "Not authenticated" };

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) return { code: null, error: error.message };
  return { code: data?.code ?? null, error: null };
}

export type ReferralStats = {
  totalReferred: number;
  totalCompleted: number;
  totalRewardCents: number;
  freeHoursEarned: number;
};

export async function getReferralStats(): Promise<{
  stats: ReferralStats;
  error: string | null;
}> {
  const session = await getSession();
  const empty: ReferralStats = {
    totalReferred: 0,
    totalCompleted: 0,
    totalRewardCents: 0,
    freeHoursEarned: 0,
  };
  if (!session) return { stats: empty, error: "Not authenticated" };

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("referrals")
    .select("id, status, reward_cents, free_hours")
    .eq("referrer_id", session.userId);

  if (error) return { stats: empty, error: error.message };

  const rows = data ?? [];
  return {
    stats: {
      totalReferred: rows.length,
      totalCompleted: rows.filter((r) => r.status === "completed").length,
      totalRewardCents: rows.reduce((s, r) => s + (r.reward_cents ?? 0), 0),
      freeHoursEarned: rows.reduce((s, r) => s + (r.free_hours ?? 0), 0),
    },
    error: null,
  };
}
