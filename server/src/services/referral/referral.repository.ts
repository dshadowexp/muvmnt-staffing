import { supabase } from "../../config/supabase"

export type ReferralStatus = 'pending' | 'completed' | 'expired'

export interface ReferralRecord {
  id:           string
  referrer_id:  string     // user who owns the code
  referee_id:   string | null  // user who used the code (null until redeemed)
  code:         string
  status:       ReferralStatus
  redeemed_at:  string | null
  expires_at:   string | null
  created_at:   string
}

export interface ReferralCodeRecord {
  user_id:    string
  code:       string
  uses:       number       // how many times this code has been used
  created_at: string
}

export class ReferralRepository {
    constructor() {}

    // ─── Referral codes (one per user) ───────────────────────────────────────

    async getCodeForUser(userId: string): Promise<ReferralCodeRecord | null> {
        const { data } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('user_id', userId)
            .single();

        return data as ReferralCodeRecord ?? null;
    }

    async createCode(userId: string, code: string): Promise<ReferralCodeRecord> {
        const { data, error } = await supabase
            .from('referral_codes')
            .insert({ user_id: userId, code, uses: 0, created_at: new Date().toISOString() })
            .select()
            .single();

        if (error) throw new Error(`Failed to create referral code: ${error.message}`);
        return data as ReferralCodeRecord;
    }

    async incrementUses(code: string): Promise<void> {
        const { error } = await supabase.rpc('increment_referral_uses', { p_code: code });
        if (error) throw new Error(`Failed to increment referral uses: ${error.message}`);
    }

    async findByCode(code: string): Promise<ReferralCodeRecord | null> {
        const { data } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', code)
        .single();

        return data as ReferralCodeRecord ?? null;
    }

    // ─── Referrals (one per code use) ────────────────────────────────────────

    async create(params: {
        referrerId: string
        code:       string
        expiresAt?: string
    }): Promise<ReferralRecord> {
        const { data, error } = await supabase
            .from('referrals')
            .insert({
                referrer_id: params.referrerId,
                referee_id:  null,
                code:        params.code,
                status:      'pending',
                redeemed_at: null,
                expires_at:  params.expiresAt ?? null,
                created_at:  new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create referral: ${error.message}`);
        return data as ReferralRecord;
    }

    async redeem(params: {
        code:      string
        refereeId: string
    }): Promise<ReferralRecord | null> {
        const { data, error } = await supabase
            .from('referrals')
            .update({
                referee_id:  params.refereeId,
                status:      'completed',
                redeemed_at: new Date().toISOString(),
            })
            .eq('code', params.code)
            .eq('status', 'pending')
            .select()
            .single();

        if (error) return null;
        return data as ReferralRecord;
    }

    async hasRefereeUsedAnyCode(refereeId: string): Promise<boolean> {
        const { data } = await supabase
            .from('referrals')
            .select('id')
            .eq('referee_id', refereeId)
            .eq('status', 'completed')
            .limit(1);

        return (data?.length ?? 0) > 0;
    }

    async findByReferrer(referrerId: string): Promise<ReferralRecord[]> {
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', referrerId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch referrals: ${error.message}`);
        return (data ?? []) as ReferralRecord[];
    }

    async findByReferee(refereeId: string): Promise<ReferralRecord | null> {
        const { data } = await supabase
            .from('referrals')
            .select('*')
            .eq('referee_id', refereeId)
            .eq('status', 'completed')
            .single();

        return data as ReferralRecord ?? null;
    }
}