import { createHash } from 'node:crypto';
import { StripeProcessor } from './processors/stripe.processor';
import { PayoutRepository, PayoutRecord } from './payout.repository';
import { PayoutStateMachine, InvalidTransitionError } from './payment.state-machine';
import { logger } from '../../config/logger';
import { supabase } from '../../config/supabase';

export interface InitiateWorkerPayoutParams {
    paymentId:         string
    shiftId:           string
    workerAmountCents: number
}

export interface OnboardWorkerParams {
    workerId:   string
    email:      string
    firstName:  string
    lastName:   string
    phone?:     string
    returnUrl:  string
    refreshUrl: string
}

export class PayoutService {
    private readonly stripe: StripeProcessor
    private readonly repo:   PayoutRepository

    constructor() {
        this.stripe = StripeProcessor.getInstance();
        this.repo   = new PayoutRepository();
    }

    async onboardWorker(params: OnboardWorkerParams): Promise<{ onboardingUrl: string }> {
        const { workerId, email, firstName, lastName, phone, returnUrl, refreshUrl } = params

        const { data: existingWorker } = await supabase
            .from('workers')
            .select('stripe_account_id')
            .eq('id', workerId)
            .single();

        let stripeAccountId = existingWorker?.stripe_account_id

        if (!stripeAccountId) {
        const account = await this.stripe.createConnectAccount({ email, firstName, lastName, phone })
        stripeAccountId = account.id
        await supabase
            .from('workers')
            .update({ stripe_account_id: stripeAccountId })
            .eq('id', workerId)
        }

        const onboardingUrl = await this.stripe.createAccountOnboardingLink({
        accountId: stripeAccountId, returnUrl, refreshUrl,
        })

        return { onboardingUrl }
    }

    async initiateWorkerPayout(params: InitiateWorkerPayoutParams): Promise<void> {
        const { paymentId, shiftId, workerAmountCents } = params

        const existing = await this.repo.findByPaymentId(paymentId)
        if (existing) {
        logger.info({ paymentId }, 'Payout already exists — skipping')
        return
        }

        const { data: shift } = await supabase
        .from('shifts')
        .select('worker_id, workers(stripe_account_id)')
        .eq('id', shiftId)
        .single()

        if (!shift) throw new Error(`Shift ${shiftId} not found`)

        const workerId        = shift.worker_id
        const stripeAccountId = (shift.workers as any)?.stripe_account_id

        if (!stripeAccountId) throw new Error(`Worker ${workerId} has no Stripe Connect account`)

        const account = await this.stripe.getAccount(stripeAccountId)
        if (!account.charges_enabled) throw new Error(`Worker ${workerId} Connect account not enabled`)

        const idempotencyKey = this.deriveKey(`payout:transfer:${paymentId}`)

        const transfer = await this.stripe.createTransfer({
        amountCents: workerAmountCents, destinationAccountId: stripeAccountId,
        shiftId, workerId, idempotencyKey,
        })

        const payout = await this.repo.create({
        paymentId, workerId, amountCents: workerAmountCents,
        stripeTransferId: transfer.id, stripeAccountId, idempotencyKey,
        })

        // pending → pending (transfer recorded)
        await this.transition(payout.id, payout.status, 'TRANSFER_CREATED')

        await this.triggerBankPayout(payout.id, stripeAccountId, workerId, workerAmountCents)
    }

    private async triggerBankPayout(
        payoutId: string, stripeAccountId: string,
        workerId: string, amountCents: number
    ): Promise<void> {
        const idempotencyKey = this.deriveKey(`payout:bank:${payoutId}`)
        try {
        const stripePayout = await this.stripe.createPayout({
            amountCents, connectedAccountId: stripeAccountId, workerId, idempotencyKey,
        })

        // pending → in_transit
        await this.transition(payoutId, 'pending', 'BANK_PAYOUT_TRIGGERED', stripePayout.id)

        logger.info({ payoutId, stripePayoutId: stripePayout.id }, 'Bank payout triggered')
        } catch (err) {
        logger.error({ err, payoutId }, 'Bank payout trigger failed — funds in Connect balance')
        }
    }

    // Called from webhook: payout.paid
    async handlePayoutPaid(stripePayoutId: string): Promise<void> {
        const payout = await this.findByStripePayoutId(stripePayoutId)
        if (!payout) return
        await this.transition(payout.id, payout.status, 'STRIPE_PAYOUT_PAID')
        logger.info({ stripePayoutId }, 'Payout landed in worker bank')
    }

    // Called from webhook: payout.failed
    async handlePayoutFailed(stripePayoutId: string): Promise<void> {
        const payout = await this.findByStripePayoutId(stripePayoutId)
        if (!payout) return
        await this.transition(payout.id, payout.status, 'STRIPE_PAYOUT_FAILED')
        logger.error({ stripePayoutId, workerId: payout.worker_id }, 'Payout failed')
    }

    // Called from webhook: payout.canceled
    async handlePayoutCanceled(stripePayoutId: string): Promise<void> {
        const payout = await this.findByStripePayoutId(stripePayoutId)
        if (!payout) return
        await this.transition(payout.id, payout.status, 'STRIPE_PAYOUT_CANCELED')
    }

    // Called by ops to retry a failed payout
    async retryPayout(payoutId: string): Promise<void> {
        const payout = await this.repo.findByPaymentId(payoutId)
        if (!payout) throw new Error(`Payout ${payoutId} not found`)

        if (!PayoutStateMachine.canTransition(payout.status, 'OPS_RETRY')) {
        throw new Error(`Cannot retry payout in status: ${payout.status}`)
        }

        await this.transition(payout.id, payout.status, 'OPS_RETRY')
        await this.triggerBankPayout(payout.id, payout.stripe_account_id, payout.worker_id, payout.amount_cents)
    }

    async findByWorkerId(workerId: string): Promise<PayoutRecord[]> {
        return this.repo.findByWorkerId(workerId)
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private async transition(
        payoutId:      string,
        currentStatus: string,
        event:         Parameters<typeof PayoutStateMachine.transition>[1],
        stripePayoutId?: string
    ): Promise<string | null> {
        try {
            const nextStatus = PayoutStateMachine.transition(
                currentStatus as Parameters<typeof PayoutStateMachine.transition>[0],
                event
            )
            await this.repo.updateStatus(payoutId, nextStatus, stripePayoutId)
            logger.info({ payoutId, from: currentStatus, event, to: nextStatus }, 'Payout state transition')
            return nextStatus;
        } catch (err) {
            if (err instanceof InvalidTransitionError) {
                logger.warn({ payoutId, currentStatus, event }, 'Invalid payout transition — skipping');
                return null;
            }
            throw err;
        }
    }

    private async findByStripePayoutId(stripePayoutId: string): Promise<PayoutRecord | null> {
        const { data } = await supabase
            .from('payouts')
            .select('*')
            .eq('stripe_payout_id', stripePayoutId)
            .single();
        return data as PayoutRecord ?? null;
    }

    private deriveKey(input: string): string {
        return createHash('sha256').update(input).digest('hex')
    }
}