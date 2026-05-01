import { getReferralCode, getReferralStats, type ReferralStats } from "../dal/queries";
import { createReferralCode } from "../dal/mutations";
import { STAFF_ROLE } from "@/features/auth/types";
import { getSession } from "@/lib/get-session";

export type ReferralViewData = {
  code: string | null;
  stats: ReferralStats | null;
  error: string | null;
};

/**
 * Loads referral code (creating if needed) and stats in one server pass for the
 * dashboard referral page. Mirrors `getOrCreateReferralCodeAction` + `getReferralStatsAction`.
 */
export async function loadReferralViewData(): Promise<ReferralViewData> {
  const session = await getSession();
  if (!session) return { code: null, stats: null, error: "Not authenticated" };
  if (session.role !== STAFF_ROLE) return { code: null, stats: null, error: "Not authorized" };

  const { code, error: getError } = await getReferralCode();
  if (code) {
    const { stats, error: statsError } = await getReferralStats();
    return {
      code,
      stats: statsError ? null : stats,
      error: null,
    };
  }
  if (getError && getError !== "Not authenticated") {
    return { code: null, stats: null, error: getError };
  }

  const created = await createReferralCode();
  if (created.error || !created.code) {
    return { code: null, stats: null, error: created.error };
  }
  const { stats, error: statsError } = await getReferralStats();
  return {
    code: created.code,
    stats: statsError ? null : stats,
    error: null,
  };
}
