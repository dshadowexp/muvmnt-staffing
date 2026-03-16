import { randomBytes } from 'node:crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import { Logger } from 'pino'
import { ReferralRepository, ReferralRecord, ReferralCodeRecord } from './referral.repository'
import { logger } from '../../config/logger'

export interface ReferralServiceDeps {
  supabase: SupabaseClient
  logger:   Logger
}

export interface ReferralStats {
  code:            string
  totalReferrals:  number
  completed:       number
  pending:         number
  referrals:       ReferralRecord[]
}

export interface RedeemResult {
  referrerId: string
  refereeId:  string
  code:       string
  redeemedAt: string
}

export class ReferralService {
    private readonly repo: ReferralRepository

    constructor() {
        this.repo = new ReferralRepository()
    }

    // ─── Get or create a referral code for a user ─────────────────────────────
    // Each user gets exactly one code for life.

    async getOrCreateCode(userId: string): Promise<ReferralCodeRecord> {
        const existing = await this.repo.getCodeForUser(userId);
        if (existing) return existing;

        const code   = this.generateCode();
        const record = await this.repo.createCode(userId, code);

        logger.info({ userId, code }, 'Referral code created');
        return record;
    }

    // ─── Validate a code (check it exists, belongs to someone else) ───────────

    async validateCode(code: string, requestingUserId: string): Promise<{
        valid:      boolean
        reason?:    string
        referrerId?: string
    }> {
        const codeRecord = await this.repo.findByCode(code);

        if (!codeRecord) {
            return { valid: false, reason: 'Invalid referral code' };
        }

        if (codeRecord.user_id === requestingUserId) {
            return { valid: false, reason: 'You cannot use your own referral code' };
        }

        const alreadyReferred = await this.repo.hasRefereeUsedAnyCode(requestingUserId);
        if (alreadyReferred) {
            return { valid: false, reason: 'You have already used a referral code' };
        }

        return { valid: true, referrerId: codeRecord.user_id };
    }

    // ─── Redeem a code ────────────────────────────────────────────────────────
    // Called after a new user completes signup with a referral code.

    async redeemCode(params: {
        code:      string
        refereeId: string
    }): Promise<RedeemResult> {
        const validation = await this.validateCode(params.code, params.refereeId);

        if (!validation.valid) {
            throw new Error(validation.reason);
        }

        // Create referral record if one doesn't exist for this code yet
        const codeRecord = await this.repo.findByCode(params.code)!;

        const redeemed = await this.repo.redeem({
            code:      params.code,
            refereeId: params.refereeId,
        });

        if (!redeemed) {
            throw new Error('Referral code could not be redeemed — it may have already been used');
        }

        await this.repo.incrementUses(params.code);

        logger.info(
            { referrerId: validation.referrerId, refereeId: params.refereeId, code: params.code },
            'Referral code redeemed'
        );

        return {
            referrerId: validation.referrerId!,
            refereeId:  params.refereeId,
            code:       params.code,
            redeemedAt: redeemed.redeemed_at!,
        }
    }

    // ─── Get stats for a referrer ─────────────────────────────────────────────

    async getStats(userId: string): Promise<ReferralStats> {
        const codeRecord = await this.getOrCreateCode(userId)
        const referrals  = await this.repo.findByReferrer(userId)

        return {
            code:           codeRecord.code,
            totalReferrals: referrals.length,
            completed:      referrals.filter((r) => r.status === 'completed').length,
            pending:        referrals.filter((r) => r.status === 'pending').length,
            referrals,
        }
    }

    // ─── Get which referral brought in a user (if any) ────────────────────────

    async getReferredBy(userId: string): Promise<ReferralRecord | null> {
        return this.repo.findByReferee(userId)
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    // 8-char uppercase alphanumeric — e.g. "A3FX9K2M"
    private generateCode(): string {
        return randomBytes(6)
            .toString('base64')
            .replace(/[^A-Z0-9]/gi, '')
            .toUpperCase()
            .slice(0, 8)
            .padEnd(8, 'A');
    }
}