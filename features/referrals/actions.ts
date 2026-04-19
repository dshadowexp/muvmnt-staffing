"use server";

import { getReferralCode, getReferralStats } from "./dal/queries";
import { createReferralCode, recordReferral } from "./dal/mutations";

export async function getOrCreateReferralCodeAction() {
  const { code, error } = await getReferralCode();
  if (code) return { code, error: null };
  if (error && error !== "Not authenticated") {
    return { code: null, error };
  }

  return createReferralCode();
}

export async function getReferralStatsAction() {
  return getReferralStats();
}

export async function recordReferralAction() {
  return recordReferral();
}
