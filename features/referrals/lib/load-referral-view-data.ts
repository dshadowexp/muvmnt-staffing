import { getReferralCode, getReferralStats, type ReferralStats } from "../dal/queries";
import { createReferralCode } from "../dal/mutations";

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
