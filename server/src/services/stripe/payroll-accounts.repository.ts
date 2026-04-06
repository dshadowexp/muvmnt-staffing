import { logger } from '../../config/logger';
import { supabase } from '../../config/supabase';

export async function syncPayrollAccountFromStripeAccount(eventObject: any): Promise<void> {
    const stripeAccountId = eventObject.acount;
    const userId = eventObject.metadata?.user_id ?? eventObject.metadata?.userId;

    const byId = await supabase
        .from('payroll_accounts')
        .update({ stripe_account_id: stripeAccountId })
        .eq('stripe_account_id', stripeAccountId)
        .select('id');

    if (byId.error) throw byId.error;
    if (byId.data?.length) return;

    if (userId) {
        const byUser = await supabase
            .from('payroll_accounts')
            .update({ 
                stripe_account_id: stripeAccountId,
                payouts_enabled: eventObject.payouts_enabled,
                charges_enabled: eventObject.charges_enabled,
                details_submitted: eventObject.details_submitted,
            })
            .eq('user_id', userId)
            .select('id');

        if (byUser.error) throw byUser.error;
        if (byUser.data?.length) return;

        const insert = await supabase.from('payroll_accounts').insert({
            user_id: userId,
            stripe_account_id: stripeAccountId,
            payouts_enabled: eventObject.payouts_enabled,
            charges_enabled: eventObject.charges_enabled,
            details_submitted: eventObject.details_submitted,
        });

        if (insert.error) throw insert.error;
    } else {
        logger.error('Payload does not contain user ID');
        return;
    }
}
