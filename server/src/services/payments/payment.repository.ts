import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../config/supabase'

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'

export interface PaymentRecord {
    id:                  string
    shift_id:            string
    facility_id:         string
    amount_cents:        number
    platform_fee_cents:  number
    currency:            string
    status:              PaymentStatus
    stripe_payment_intent_id: string
    idempotency_key:     string
    created_at:          string
    updated_at:          string
}

interface CreatePaymentParams {
    shiftId:            string
    facilityId:         string
    amountCents:        number
    platformFeeCents:   number
    stripePaymentIntentId: string
    idempotencyKey:     string
    currency?:          string
}

export class PaymentRepository {
    constructor() {}

    async create(params: CreatePaymentParams): Promise<PaymentRecord> {
        const { data, error } = await supabase
            .from('payments')
            .insert({
                shift_id:                   params.shiftId,
                facility_id:                params.facilityId,
                amount_cents:               params.amountCents,
                platform_fee_cents:         params.platformFeeCents,
                currency:                   params.currency ?? 'usd',
                status:                     'pending',
                stripe_payment_intent_id:   params.stripePaymentIntentId,
                idempotency_key:            params.idempotencyKey,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create payment: ${error.message}`)
        return data as PaymentRecord
    }

    async findById(id: string): Promise<PaymentRecord | null> {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as PaymentRecord;
    }

    async findByShiftId(shiftId: string): Promise<PaymentRecord | null> {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('shift_id', shiftId)
            .single();

        if (error) return null;
        return data as PaymentRecord;
    }

    async findByPaymentIntentId(stripePaymentIntentId: string): Promise<PaymentRecord | null> {
        const { data } = await supabase
            .from('payments')
            .select('*')
            .eq('stripe_payment_intent_id', stripePaymentIntentId)
            .single();

        return data as PaymentRecord ?? null;
    }

    async updateStatus(id: string, status: PaymentStatus): Promise<void> {
        const { error } = await supabase
            .from('payments')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new Error(`Failed to update payment status: ${error.message}`);
    }
}