import { supabase } from "../../config/supabase"

export interface BillingRecord {
    user_id:             string
    stripe_customer_id:  string
    default_payment_method_id: string | null
    created_at:          string
    updated_at:          string
}
  
export class BillingRepository {
    async findByUserId(userId: string): Promise<BillingRecord | null> {
        const { data } = await supabase
            .from('billing_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();
     
        return data as BillingRecord ?? null;
    }

    async create(userId: string, stripeCustomerId: string): Promise<BillingRecord> {
        const { data, error } = await supabase
          .from('billing_accounts')
          .insert({
            user_id:            userId,
            stripe_customer_id: stripeCustomerId,
            created_at:         new Date().toISOString(),
            updated_at:         new Date().toISOString(),
          })
          .select()
          .single()
     
        if (error) throw new Error(`Failed to create billing account: ${error.message}`)
        return data as BillingRecord
    }

    async updateDefaultPaymentMethod(userId: string, paymentMethodId: string | null): Promise<void> {
        const { error } = await supabase
          .from('billing_accounts')
          .update({
            default_payment_method_id: paymentMethodId,
            updated_at:                new Date().toISOString(),
          })
          .eq('user_id', userId)
     
        if (error) throw new Error(`Failed to update default payment method: ${error.message}`)
    }
}