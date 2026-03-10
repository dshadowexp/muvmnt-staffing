import { supabase } from '../../config/supabase';

export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';

export interface PayoutRecord {
    id:                    string
    payment_id:            string
    worker_id:             string
    amount_cents:          number
    currency:              string
    status:                PayoutStatus
    stripe_transfer_id:    string
    stripe_payout_id:      string | null
    stripe_account_id:     string   // worker's Connect account
    idempotency_key:       string
    created_at:            string
    updated_at:            string
}

interface CreatePayoutParams {
    paymentId:          string
    workerId:           string
    amountCents:        number
    stripeTransferId:   string
    stripeAccountId:    string
    idempotencyKey:     string
    currency?:          string
}

export class PayoutRepository {
    constructor() {}

    async create(params: CreatePayoutParams): Promise<PayoutRecord> {
        const { data, error } = await supabase
            .from('payouts')
            .insert({
                payment_id:         params.paymentId,
                worker_id:          params.workerId,
                amount_cents:       params.amountCents,
                currency:           params.currency ?? 'usd',
                status:             'pending',
                stripe_transfer_id: params.stripeTransferId,
                stripe_payout_id:   null,
                stripe_account_id:  params.stripeAccountId,
                idempotency_key:    params.idempotencyKey,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create payout: ${error.message}`);
        return data as PayoutRecord;
    }

    async findByWorkerId(workerId: string): Promise<PayoutRecord[]> {
        const { data, error } = await supabase
            .from('payouts')
            .select('*')
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch payouts: ${error.message}`);
        return (data ?? []) as PayoutRecord[];
    }

    async findByPaymentId(paymentId: string): Promise<PayoutRecord | null> {
        const { data } = await supabase
            .from('payouts')
            .select('*')
            .eq('payment_id', paymentId)
            .single();

        return data as PayoutRecord ?? null;
    }

    async findByTransferId(stripeTransferId: string): Promise<PayoutRecord | null> {
        const { data } = await supabase
            .from('payouts')
            .select('*')
            .eq('stripe_transfer_id', stripeTransferId)
            .single();

        return data as PayoutRecord ?? null;
    }

    async updateStatus(id: string, status: PayoutStatus, stripePayoutId?: string): Promise<void> {
        const { error } = await supabase
            .from('payouts')
            .update({
                status,
                ...(stripePayoutId && { stripe_payout_id: stripePayoutId }),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw new Error(`Failed to update payout status: ${error.message}`);
    }
}