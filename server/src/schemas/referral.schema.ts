import { z } from 'zod'

const ReferralStatus = z.enum(['pending', 'completed', 'expired'])

const ReferralRecordReply = z.object({
  id:          z.string(),
  referrerId:  z.string(),
  refereeId:   z.string().nullable(),
  code:        z.string(),
  status:      ReferralStatus,
  redeemedAt:  z.string().nullable(),
  expiresAt:   z.string().nullable(),
  createdAt:   z.string(),
})

// ─── GET /referrals/code ──────────────────────────────────────────────────────

export const CodeReply = z.object({
  code:      z.string(),
  uses:      z.number().int(),
  createdAt: z.string(),
})

// ─── GET /referrals/stats ─────────────────────────────────────────────────────

export const StatsReply = z.object({
  code:           z.string(),
  totalReferrals: z.number().int(),
  completed:      z.number().int(),
  pending:        z.number().int(),
  referrals:      z.array(ReferralRecordReply),
})

// ─── POST /referrals/validate ─────────────────────────────────────────────────

export const ValidateBody = z.object({
  code: z.string().min(1, 'Code is required').max(16),
})

export const ValidateReply = z.object({
    valid:  z.boolean(),
    reason: z.string().optional(),
})

// ─── POST /referrals/redeem ───────────────────────────────────────────────────

export const RedeemBody = z.object({
    code: z.string().min(1, 'Code is required').max(16),
})

export const RedeemReply = z.object({
    referrerId: z.string(),
    refereeId:  z.string(),
    code:       z.string(),
    redeemedAt: z.string(),
})

// ─── GET /referrals/referred-by ───────────────────────────────────────────────

export const ReferredByReply = z.object({
  referredBy: ReferralRecordReply.nullable(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidateBodyType  = z.infer<typeof ValidateBody>
export type RedeemBodyType    = z.infer<typeof RedeemBody>